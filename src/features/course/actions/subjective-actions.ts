"use server";

import { db } from "@/db/db";
import { subjectiveSubmissions, students } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { revalidatePath } from "next/cache";

export async function submitSubjectiveAction(payload: {
  courseId: string;
  lessonId?: string;
  title: string;
  questionText: string;
  studentAnswer: string;
}) {
  try {
    const user = await requireAuth(["Student"]);
    verifyWriteAccess(user);

    const student = await db.query.students.findFirst({
      where: eq(students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    const { courseId, lessonId, title, questionText, studentAnswer } = payload;

    // Check if a submission already exists for this lesson/assignment
    let existing;
    if (lessonId) {
      existing = await db.query.subjectiveSubmissions.findFirst({
        where: and(
          eq(subjectiveSubmissions.lessonId, lessonId),
          eq(subjectiveSubmissions.studentId, student.id)
        ),
      });
    }

    if (existing) {
      await db
        .update(subjectiveSubmissions)
        .set({
          studentAnswer,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(subjectiveSubmissions.id, existing.id));
    } else {
      await db.insert(subjectiveSubmissions).values({
        tenantId: user.tenantId,
        courseId,
        lessonId: lessonId || null,
        studentId: student.id,
        title,
        questionText,
        studentAnswer,
        status: "pending",
        submittedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    revalidatePath(`/courses/${courseId}`);
    revalidatePath("/faculty");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit subjective assignment." };
  }
}

export async function gradeSubjectiveAction(
  submissionId: string,
  payload: {
    score: number;
    feedback: string;
    rubrics: { criteria: string; score: number; maxScore: number; feedback?: string }[];
  }
) {
  try {
    const user = await requireAuth(["Faculty", "Mentor", "Owner", "Admin"]);
    verifyWriteAccess(user);

    const submission = await db.query.subjectiveSubmissions.findFirst({
      where: eq(subjectiveSubmissions.id, submissionId),
    });

    if (!submission) {
      return { success: false, error: "Subjective submission not found." };
    }

    const { score, feedback, rubrics } = payload;

    // Build the new history entry
    const historyEntry = {
      score,
      feedback,
      rubrics,
      evaluatedBy: user.email,
      evaluatedAt: new Date().toISOString(),
    };

    const currentHistory = submission.history || [];
    const updatedHistory = [...currentHistory, historyEntry];

    await db
      .update(subjectiveSubmissions)
      .set({
        score,
        feedback,
        rubrics,
        status: "graded",
        evaluatedBy: user.userId,
        evaluatedAt: new Date(),
        history: updatedHistory,
        updatedAt: new Date(),
      })
      .where(eq(subjectiveSubmissions.id, submissionId));

    revalidatePath(`/courses/${submission.courseId}`);
    revalidatePath("/faculty");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to grade subjective submission." };
  }
}
