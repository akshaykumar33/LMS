import { db } from "@/db/db";
import { certificates, quizzes, quizAttempts, courses, students, notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export class CertificateRepository {
  /**
   * Fetch all certificates awarded to a student, with course details.
   */
  static async getStudentCertificates(tenantId: string, studentId: string) {
    return await db.query.certificates.findMany({
      where: and(
        eq(certificates.tenantId, tenantId),
        eq(certificates.studentId, studentId)
      ),
      with: {
        course: {
          columns: {
            id: true,
            code: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: [desc(certificates.issuedAt)],
    });
  }

  /**
   * Fetch full verification details of a certificate.
   */
  static async getCertificateDetails(certificateId: string) {
    const cert = await db.query.certificates.findFirst({
      where: eq(certificates.id, certificateId),
      with: {
        tenant: true,
        course: true,
        student: {
          with: {
            user: true,
          },
        },
      },
    });
    return cert;
  }

  /**
   * Verify if a student meets the criteria to earn a certificate for a course.
   * Criteria: Must attempt all quizzes in the course and achieve an average score of >= 70%.
   */
  static async verifyCourseEligibility(tenantId: string, studentId: string, courseId: string) {
    // 1. Fetch all quizzes in the course
    const courseQuizzes = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
      })
      .from(quizzes)
      .where(eq(quizzes.courseId, courseId));

    if (courseQuizzes.length === 0) {
      return { eligible: false, reason: "No assessments configured for this course." };
    }

    // 2. Fetch the best score for each quiz by this student
    const quizBestScores: number[] = [];
    
    for (const quiz of courseQuizzes) {
      const attempts = await db
        .select({ score: quizAttempts.score })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.quizId, quiz.id),
            eq(quizAttempts.studentId, studentId)
          )
        )
        .orderBy(desc(quizAttempts.score))
        .limit(1);

      if (attempts.length === 0) {
        return { 
          eligible: false, 
          reason: `You have not attempted the assessment: "${quiz.title}".` 
        };
      }
      
      quizBestScores.push(attempts[0].score);
    }

    // 3. Compute average score
    const totalScore = quizBestScores.reduce((sum, score) => sum + score, 0);
    const avgScore = Math.round(totalScore / courseQuizzes.length);

    if (avgScore < 70) {
      return { 
        eligible: false, 
        reason: `Your average score is ${avgScore}%. You need at least 70% to qualify.` 
      };
    }

    return { eligible: true, avgScore };
  }

  /**
   * Issues a certificate if the student is eligible and doesn't already have one.
   */
  static async issueCertificate(tenantId: string, studentId: string, courseId: string) {
    // 1. Check if already issued
    const existing = await db.query.certificates.findFirst({
      where: and(
        eq(certificates.studentId, studentId),
        eq(certificates.courseId, courseId)
      ),
    });

    if (existing) {
      return existing;
    }

    // 2. Verify eligibility
    const eligibility = await this.verifyCourseEligibility(tenantId, studentId, courseId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || "Not eligible for certificate.");
    }

    // 3. Load student details for the code
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
      with: { user: true },
    });
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });

    if (!student || !course) {
      throw new Error("Student or Course not found.");
    }

    // Generate readable certificate code
    const lastName = student.user.lastName.toUpperCase().replace(/[^A-Z]/g, "");
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const certificateCode = `CERT-${course.code}-${lastName}-${randomHex}`;

    // Compute grade
    let grade = "C";
    const avg = eligibility.avgScore || 0;
    if (avg >= 90) grade = "A+";
    else if (avg >= 80) grade = "A";
    else if (avg >= 70) grade = "B";

    // Insert certificate
    const [newCert] = await db
      .insert(certificates)
      .values({
        tenantId,
        studentId,
        courseId,
        certificateCode,
        metadata: {
          avgScore: avg,
          grade,
          digitalSignature: `SHA256:${Math.random().toString(36).substring(2, 15)}`,
        },
      })
      .returning();

    // 4. Create in-app success notification for student
    await db.insert(notifications).values({
      tenantId,
      userId: student.userId,
      title: "🎓 Course Certificate Awarded!",
      message: `Congratulations! You have completed all course requirements for "${course.name}" with a grade of ${grade}. Your certificate is now ready.`,
      type: "success",
    });

    return newCert;
  }
}
