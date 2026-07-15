import { db } from "@/db/db";
import { quizAttempts, quizzes, courses, students, courseBatches, admissionApplications, users, modules, lessons, lessonProgress, certificates, projectSubmissions, courseProgress } from "@/db/schema";
import { eq, and, desc, count, avg, sql, inArray } from "drizzle-orm";

export class AnalyticsRepository {
  /**
   * Get a student's quiz attempt history with course/quiz context.
   */
  static async getStudentQuizHistory(studentId: string) {
    const attempts = await db
      .select({
        attemptId: quizAttempts.id,
        score: quizAttempts.score,
        passed: quizAttempts.passed,
        createdAt: quizAttempts.createdAt,
        quizTitle: quizzes.title,
        quizPassingScore: quizzes.passingScore,
        courseName: courses.name,
        courseCode: courses.code,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .innerJoin(courses, eq(quizzes.courseId, courses.id))
      .where(eq(quizAttempts.studentId, studentId))
      .orderBy(desc(quizAttempts.createdAt));

    return attempts;
  }

  /**
   * Get student's enrolled course count and best scores per course.
   */
  static async getStudentProgressSummary(tenantId: string, batchId: string, studentId: string) {
    // Courses in batch
    const enrolledCourses = await db
      .select({ id: courses.id, name: courses.name, code: courses.code, scormEnabled: courses.scormEnabled })
      .from(courseBatches)
      .innerJoin(courses, eq(courseBatches.courseId, courses.id))
      .where(and(eq(courseBatches.batchId, batchId), eq(courses.tenantId, tenantId)));

    // Best quiz score per course
    const bestScores = await db
      .select({
        courseId: quizzes.courseId,
        bestScore: sql<number>`MAX(${quizAttempts.score})`,
        totalAttempts: count(quizAttempts.id),
        hasPassed: sql<boolean>`BOOL_OR(${quizAttempts.passed})`,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(eq(quizAttempts.studentId, studentId))
      .groupBy(quizzes.courseId);

    const scoreMap = new Map<any, any>(bestScores.map(s => [s.courseId, s]));

    const courseIds = enrolledCourses.map(c => c.id);
    let modulesList: any[] = [];
    let completedList: any[] = [];
    let courseProgressList: any[] = [];

    if (courseIds.length > 0) {
      modulesList = await db.query.modules.findMany({
        where: inArray(modules.courseId, courseIds),
        with: {
          lessons: true
        }
      });

      completedList = await db.query.lessonProgress.findMany({
        where: and(
          eq(lessonProgress.studentId, studentId),
          eq(lessonProgress.completed, true)
        )
      });

      courseProgressList = await db.query.courseProgress.findMany({
        where: eq(courseProgress.studentId, studentId)
      });
    }

    const courseProgressMap = new Map<string, any>(courseProgressList.map(p => [p.courseId, p]));

    // Map courseId -> all lessons
    const courseLessonsMap = new Map<string, string[]>();
    for (const mod of modulesList) {
      const existing = courseLessonsMap.get(mod.courseId) || [];
      const lessonIds = (mod.lessons || []).map((l: any) => l.id);
      courseLessonsMap.set(mod.courseId, [...existing, ...lessonIds]);
    }

    const completedLessonIdsSet = new Set(completedList.map(p => p.lessonId));

    return enrolledCourses.map(c => {
      let progressPercent = 0;
      let hasPassed = false;
      let bestScore = scoreMap.get(c.id)?.bestScore ?? null;

      if (c.scormEnabled) {
        const p = courseProgressMap.get(c.id);
        progressPercent = p?.completed ? 100 : 0;
        const data = (p?.scormData || {}) as Record<string, any>;
        const score = data["cmi.core.score.raw"] || data["cmi.score.raw"] || null;
        if (score !== null) {
          bestScore = Number(score);
        }
        const status = (data["cmi.core.lesson_status"] || data["cmi.completion_status"] || "").toLowerCase();
        hasPassed = ["completed", "passed"].includes(status) || p?.completed || false;
      } else {
        const courseLessonIds = courseLessonsMap.get(c.id) || [];
        const totalLessons = courseLessonIds.length;
        const completedCount = courseLessonIds.filter(id => completedLessonIdsSet.has(id)).length;
        progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        hasPassed = scoreMap.get(c.id)?.hasPassed ?? false;
      }

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        scormEnabled: c.scormEnabled,
        bestScore,
        totalAttempts: scoreMap.get(c.id)?.totalAttempts ?? 0,
        hasPassed,
        progressPercent,
      };
    });
  }

  /**
   * Admin: Tenant-wide enrollment and performance stats.
   */
  static async getTenantAnalytics(tenantId: string) {
    const [appStats] = await db
      .select({
        totalApplications: count(admissionApplications.id),
        approved: sql<number>`COUNT(*) FILTER (WHERE ${admissionApplications.status} = 'approved')`,
        pending: sql<number>`COUNT(*) FILTER (WHERE ${admissionApplications.status} = 'pending' OR ${admissionApplications.status} = 'under_review')`,
        rejected: sql<number>`COUNT(*) FILTER (WHERE ${admissionApplications.status} = 'rejected')`,
      })
      .from(admissionApplications)
      .where(eq(admissionApplications.tenantId, tenantId));

    const [studentStats] = await db
      .select({ totalStudents: count(students.id) })
      .from(students)
      .where(eq(students.tenantId, tenantId));

    const [courseStats] = await db
      .select({ totalCourses: count(courses.id) })
      .from(courses)
      .where(eq(courses.tenantId, tenantId));

    const [quizStats] = await db
      .select({
        totalAttempts: count(quizAttempts.id),
        avgScore: sql<number>`COALESCE(AVG(${quizAttempts.score}), 0)`,
        passRate: sql<number>`COALESCE(100.0 * COUNT(*) FILTER (WHERE ${quizAttempts.passed}) / NULLIF(COUNT(*), 0), 0)`,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .innerJoin(courses, eq(quizzes.courseId, courses.id))
      .where(eq(courses.tenantId, tenantId));

    const [staffCount] = await db
      .select({ total: count(users.id) })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        sql`${users.role} IN ('Owner', 'Admin', 'Faculty', 'Mentor', 'Program Manager')`
      ));

    return {
      applications: {
        totalApplications: Number(appStats?.totalApplications ?? 0),
        approved: Number(appStats?.approved ?? 0),
        pending: Number(appStats?.pending ?? 0),
        rejected: Number(appStats?.rejected ?? 0),
      },
      totalStudents: Number(studentStats?.totalStudents ?? 0),
      totalStaff: Number(staffCount?.total ?? 0),
      totalCourses: Number(courseStats?.totalCourses ?? 0),
      quizPerformance: {
        totalAttempts: Number(quizStats?.totalAttempts ?? 0),
        avgScore: Math.round(Number(quizStats?.avgScore ?? 0)),
        passRate: Math.round(Number(quizStats?.passRate ?? 0)),
      },
    };
  }

  /**
   * Get a student's gamification profile (XP, level, streak, badges, recent activities).
   */
  static async getStudentGamification(studentId: string) {
    // 1. Fetch quiz attempts
    const attempts = await db.query.quizAttempts.findMany({
      where: eq(quizAttempts.studentId, studentId),
      with: {
        quiz: {
          with: {
            course: true
          }
        }
      },
      orderBy: desc(quizAttempts.createdAt)
    });

    // 2. Fetch lesson progress
    const progressLogs = await db.query.lessonProgress.findMany({
      where: eq(lessonProgress.studentId, studentId),
      with: {
        lesson: {
          with: {
            module: {
              with: {
                course: true
              }
            }
          }
        }
      },
      orderBy: desc(lessonProgress.updatedAt)
    });

    // Fetch course progress
    const courseProgressLogs = await db.query.courseProgress.findMany({
      where: eq(courseProgress.studentId, studentId),
      with: {
        course: true
      },
      orderBy: desc(courseProgress.updatedAt)
    });

    // 3. Fetch certificates
    const certs = await db.query.certificates.findMany({
      where: eq(certificates.studentId, studentId),
      with: {
        course: true
      },
      orderBy: desc(certificates.issuedAt)
    });

    // 4. Fetch project submissions
    const submissions = await db.query.projectSubmissions.findMany({
      where: eq(projectSubmissions.studentId, studentId),
      with: {
        project: {
          with: {
            course: true
          }
        }
      },
      orderBy: desc(projectSubmissions.submittedAt)
    });

    // Calculate XP
    let xp = 0;
    const activityLogs: { text: string; xp: string; date: Date | string }[] = [];

    // Lesson completions: +25 XP
    for (const log of progressLogs) {
      if (log.completed) {
        xp += 25;
        activityLogs.push({
          text: `Completed Lesson: ${log.lesson?.title || "Lesson"}`,
          xp: "+25 XP",
          date: log.updatedAt
        });
      }
    }

    // Course-level SCORM completions: +50 XP
    for (const log of courseProgressLogs) {
      if (log.completed) {
        xp += 50;
        activityLogs.push({
          text: `Completed SCORM Course Package: ${log.course?.name || "Course"}`,
          xp: "+50 XP",
          date: log.updatedAt
        });
      }
    }

    // Quiz attempts: Pass = 150 XP, Fail = 50 XP
    for (const att of attempts) {
      const isPass = att.passed;
      const pts = isPass ? 150 : 50;
      xp += pts;
      activityLogs.push({
        text: `${isPass ? "Passed" : "Attempted"} Quiz: ${att.quiz?.title || "Quiz"}`,
        xp: `+${pts} XP`,
        date: att.createdAt
      });
    }

    // Certificates: +200 XP
    for (const cert of certs) {
      xp += 200;
      activityLogs.push({
        text: `Earned Certificate for: ${cert.course?.name || "Course"}`,
        xp: "+200 XP",
        date: cert.issuedAt
      });
    }

    // Capstone Project Submissions: reviewed/completed = 300 XP, pending = 100 XP
    for (const sub of submissions) {
      const isReviewed = sub.status === "reviewed";
      const pts = isReviewed ? 300 : 100;
      xp += pts;
      activityLogs.push({
        text: `${isReviewed ? "Graded" : "Submitted"} Project: ${sub.project?.title || "Project"}`,
        xp: `+${pts} XP`,
        date: sub.submittedAt
      });
    }

    // Sort activity logs by date (newest first)
    activityLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate level (250 XP per level, starts at level 1)
    const level = Math.floor(xp / 250) + 1;

    // Calculate streak dynamically
    const activityDates = new Set<string>();
    [...attempts.map(a => a.createdAt), ...progressLogs.map(l => l.updatedAt), ...courseProgressLogs.map(l => l.updatedAt), ...submissions.map(s => s.submittedAt)]
      .forEach(d => {
        if (d) {
          const dateStr = new Date(d).toDateString();
          activityDates.add(dateStr);
        }
      });

    let streak = 0;
    const today = new Date();
    let currentCheck = new Date(today);

    // If no activity today, check if yesterday was active to continue the streak
    if (!activityDates.has(currentCheck.toDateString())) {
      currentCheck.setDate(currentCheck.getDate() - 1);
    }

    while (activityDates.has(currentCheck.toDateString())) {
      streak++;
      currentCheck.setDate(currentCheck.getDate() - 1);
    }

    // Determine achievements/badges
    const badges = [
      {
        id: "pioneer",
        name: "Pioneer Scholar",
        desc: "Successfully enrolled in the CoE batch.",
        unlocked: true
      },
      {
        id: "focus",
        name: "Focus Master",
        desc: "Completed at least 1 course lesson.",
        unlocked: progressLogs.some(l => l.completed)
      },
      {
        id: "streak",
        name: "Daily Habit",
        desc: "Maintained a 3-day active study streak.",
        unlocked: streak >= 3
      },
      {
        id: "perfect",
        name: "Perfect Score",
        desc: "Earned 100% on any module quiz.",
        unlocked: attempts.some(a => a.score === 100)
      },
      {
        id: "graduate",
        name: "Alumni Candidate",
        desc: "Earned a verified completion certificate.",
        unlocked: certs.length > 0
      }
    ];

    return {
      xp,
      level,
      streak,
      badges,
      activityLogs: activityLogs.slice(0, 5)
    };
  }
}
