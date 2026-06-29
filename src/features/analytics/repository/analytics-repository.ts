import { db } from "@/db/db";
import { quizAttempts, quizzes, courses, students, courseBatches, admissionApplications, users } from "@/db/schema";
import { eq, and, desc, count, avg, sql } from "drizzle-orm";

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

    return enrolledCourses.map(c => ({
      ...c,
      bestScore: scoreMap.get(c.id)?.bestScore ?? null,
      totalAttempts: scoreMap.get(c.id)?.totalAttempts ?? 0,
      hasPassed: scoreMap.get(c.id)?.hasPassed ?? false,
    }));
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
      applications: appStats,
      totalStudents: studentStats.totalStudents,
      totalStaff: staffCount.total,
      totalCourses: courseStats.totalCourses,
      quizPerformance: {
        totalAttempts: quizStats.totalAttempts,
        avgScore: Math.round(Number(quizStats.avgScore)),
        passRate: Math.round(Number(quizStats.passRate)),
      },
    };
  }
}
