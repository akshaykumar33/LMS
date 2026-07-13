"use server";

import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { QuizRepository, SubmittedAnswer } from "../repository/quiz-repository";
import { db } from "@/db/db";
import { students, users } from "@/db/schema";
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

export async function submitQuizAttemptAction(quizId: string, answers: SubmittedAnswer[], infractionCount?: number) {
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
      answers,
      infractionCount
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

    try {
      const { sendXapiStatement } = require("@/features/analytics/services/xapi-service");
      const [studentProfile] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(students)
        .innerJoin(users, eq(students.userId, users.id))
        .where(eq(students.id, student.id));

      const fullName = studentProfile
        ? `${studentProfile.firstName} ${studentProfile.lastName}`
        : user.email;

      await sendXapiStatement(user.tenantId, {
        actorEmail: user.email,
        actorName: fullName,
        verbId: "http://adlnet.gov/expapi/verbs/answered",
        verbDisplay: "answered",
        activityId: `https://wysbryx.com/activities/quizzes/${quizId}`,
        activityName: result.quizTitle || "Quiz",
        resultScoreRaw: result.score,
        resultSuccess: result.passed,
        resultCompletion: true,
      });
    } catch (e) {
      console.error("Failed to send xAPI statement for quiz:", e);
    }

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}
