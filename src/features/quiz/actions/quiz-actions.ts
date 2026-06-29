"use server";

import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { QuizRepository, SubmittedAnswer } from "../repository/quiz-repository";
import { db } from "@/db/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getQuizDetailsAction(quizId: string) {
  try {
    const user = await requireAuth();
    if (!user) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    const quiz = await QuizRepository.getQuizDetails(user.tenantId, quizId);
    if (!quiz) {
      return { success: false, error: "Quiz not found." };
    }

    return { success: true, data: quiz };
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

export async function submitQuizAttemptAction(quizId: string, answers: SubmittedAnswer[]) {
  try {
    const user = await requireAuth();
    if (!user) {
      return { success: false, error: "UNAUTHORIZED" };
    }
    verifyWriteAccess(user);

    // Resolve Student Profile ID
    const [student] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, user.userId));

    if (!student) {
      return { success: false, error: "No student profile found for your account." };
    }

    const result = await QuizRepository.submitAttempt(
      user.tenantId,
      student.id,
      quizId,
      answers
    );

    try {
      const { NotificationRepository } = require("@/features/notification/repository/notification-repository");
      await NotificationRepository.createNotification(
        user.tenantId,
        user.userId,
        "Quiz Graded",
        `You scored ${result.score}% on the quiz "${result.quizTitle}". Result: ${result.passed ? "PASSED" : "FAILED"}.`,
        result.passed ? "success" : "warning"
      );
    } catch (e) {
      console.error("Failed to trigger quiz notification:", e);
    }

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}
