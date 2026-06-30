import { db } from "@/db/db";
import { courses, batches, students, users, quizAttempts, quizzes, lessons, modules, admissionApplications } from "@/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

export class FacultyRepository {
  /**
   * Get all courses in the tenant.
   */
  static async getTenantCourses(tenantId: string) {
    return db.query.courses.findMany({
      where: eq(courses.tenantId, tenantId),
      orderBy: [courses.code],
    });
  }

  /**
   * Get all batches in the tenant with student count.
   */
  static async getTenantBatches(tenantId: string) {
    const batchList = await db
      .select({
        id: batches.id,
        name: batches.name,
        startDate: batches.startDate,
        studentCount: count(students.id),
      })
      .from(batches)
      .leftJoin(students, eq(students.batchId, batches.id))
      .where(eq(batches.tenantId, tenantId))
      .groupBy(batches.id, batches.name, batches.startDate);

    return batchList;
  }

  /**
   * Get all students in a specific batch.
   */
  static async getBatchRoster(tenantId: string, batchId: string) {
    return db
      .select({
        studentId: sql<string>`${students.id}`.as("studentId"),
        rollNumber: students.rollNumber,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        userId: sql<string>`${users.id}`.as("userId"),
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(
        and(
          eq(students.tenantId, tenantId),
          eq(students.batchId, batchId)
        )
      )
      .orderBy(users.firstName);
  }

  /**
   * Get all quiz attempts in the tenant for faculty review.
   */
  static async getRecentAttempts(tenantId: string, limit = 50) {
    return db
      .select({
        attemptId: quizAttempts.id,
        score: quizAttempts.score,
        passed: quizAttempts.passed,
        createdAt: quizAttempts.createdAt,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        quizTitle: quizzes.title,
        courseCode: courses.code,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .innerJoin(courses, eq(quizzes.courseId, courses.id))
      .innerJoin(students, eq(quizAttempts.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(courses.tenantId, tenantId))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(limit);
  }

  /**
   * Schedule a new live class lesson.
   */
  static async scheduleLiveClass(
    tenantId: string,
    moduleId: string,
    title: string,
    zoomMeetingId: string,
    zoomPasscode: string
  ) {
    // 1. Verify module belongs to tenant
    const [mod] = await db
      .select({ id: modules.id })
      .from(modules)
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(
        and(
          eq(modules.id, moduleId),
          eq(courses.tenantId, tenantId)
        )
      );

    if (!mod) {
      throw new Error("Unauthorized or invalid module.");
    }

    // 2. Get next order number for lessons in this module
    const [lastLesson] = await db
      .select({ order: lessons.order })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(desc(lessons.order))
      .limit(1);

    const nextOrder = (lastLesson?.order ?? 0) + 1;

    // 3. Insert live class lesson
    const [newLivelink] = await db
      .insert(lessons)
      .values({
        moduleId,
        title,
        contentType: "live_class",
        zoomMeetingId,
        zoomPasscode,
        order: nextOrder,
      })
      .returning();

    return newLivelink;
  }

  /**
   * Get dynamic student statistics for the profile modal
   */
  static async getStudentProfileStats(tenantId: string, studentId: string) {
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.tenantId, tenantId)
      ),
      with: {
        batch: true,
        user: true,
      }
    });

    if (!student) {
      throw new Error("Student not found.");
    }

    // Fetch all quiz attempts for this student
    const attempts = await db.query.quizAttempts.findMany({
      where: eq(quizAttempts.studentId, studentId),
      with: {
        quiz: true
      },
      orderBy: [desc(quizAttempts.createdAt)]
    });

    // Fetch admissions academic history using email address
    const application = await db.query.admissionApplications.findFirst({
      where: and(
        eq(admissionApplications.tenantId, tenantId),
        eq(sql`LOWER(${admissionApplications.email})`, student.user.email.toLowerCase())
      )
    });

    return {
      student,
      attempts,
      academicHistory: application?.academicHistory || null
    };
  }
}
