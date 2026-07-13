import { db } from "@/db/db";
import { quizAttempts, quizzes, courses, students, courseBatches, admissionApplications, users, modules, lessons, lessonProgress } from "@/db/schema";
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
      .select({ id: courses.id, name: courses.name, code: courses.code })
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
    }

    // Map courseId -> all lessons
    const courseLessonsMap = new Map<string, string[]>();
    for (const mod of modulesList) {
      const existing = courseLessonsMap.get(mod.courseId) || [];
      const lessonIds = (mod.lessons || []).map((l: any) => l.id);
      courseLessonsMap.set(mod.courseId, [...existing, ...lessonIds]);
    }

    const completedLessonIdsSet = new Set(completedList.map(p => p.lessonId));

    return enrolledCourses.map(c => {
      const courseLessonIds = courseLessonsMap.get(c.id) || [];
      const totalLessons = courseLessonIds.length;
      const completedCount = courseLessonIds.filter(id => completedLessonIdsSet.has(id)).length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return {
        ...c,
        bestScore: scoreMap.get(c.id)?.bestScore ?? null,
        totalAttempts: scoreMap.get(c.id)?.totalAttempts ?? 0,
        hasPassed: scoreMap.get(c.id)?.hasPassed ?? false,
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
}
