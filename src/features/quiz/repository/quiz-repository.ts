import { db } from "@/db/db";
import { quizzes, quizQuestions, quizAttempts, courses } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export interface SubmittedAnswer {
  questionId: string;
  selectedOptionId: string;
}

export class QuizRepository {
  /**
   * Retrieves quiz details and questions for the client, omitting correctOptionId to prevent inspection.
   */
  static async getQuizDetails(tenantId: string, quizId: string) {
    // 1. Fetch Quiz & confirm tenant ownership
    const [quiz] = await db
      .select({
        id: quizzes.id,
        courseId: quizzes.courseId,
        lessonId: quizzes.lessonId,
        title: quizzes.title,
        description: quizzes.description,
        passingScore: quizzes.passingScore,
      })
      .from(quizzes)
      .innerJoin(courses, eq(quizzes.courseId, courses.id))
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(courses.tenantId, tenantId)
        )
      );

    if (!quiz) return null;

    // 2. Fetch Questions (omitting answer key)
    const questions = await db
      .select({
        id: quizQuestions.id,
        questionText: quizQuestions.questionText,
        questionType: quizQuestions.questionType,
        options: quizQuestions.options,
        order: quizQuestions.order,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.order));

    return {
      ...quiz,
      questions,
    };
  }

  /**
   * Submits and evaluates a student's quiz attempt.
   */
  static async submitAttempt(
    tenantId: string,
    studentId: string,
    quizId: string,
    answers: SubmittedAnswer[],
    infractionCount: number = 0
  ) {
    // 1. Fetch Quiz with its correct keys
    const [quiz] = await db
      .select({
        id: quizzes.id,
        passingScore: quizzes.passingScore,
        title: quizzes.title,
      })
      .from(quizzes)
      .innerJoin(courses, eq(quizzes.courseId, courses.id))
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(courses.tenantId, tenantId)
        )
      );

    if (!quiz) {
      throw new Error("Quiz not found or not authorized.");
    }

    // 2. Fetch Questions (including correct keys)
    const dbQuestions = await db
      .select({
        id: quizQuestions.id,
        correctOptionId: quizQuestions.correctOptionId,
        questionText: quizQuestions.questionText,
        options: quizQuestions.options,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId));

    const questionsMap = new Map<any, any>(dbQuestions.map(q => [q.id, q]));

    // 3. Score evaluation
    let correctCount = 0;
    const details: any[] = [];

    for (const ans of answers) {
      const q = questionsMap.get(ans.questionId);
      if (!q) continue;

      const isCorrect = q.correctOptionId === ans.selectedOptionId;
      if (isCorrect) correctCount++;

      details.push({
        questionId: q.id,
        questionText: q.questionText,
        selectedOptionId: ans.selectedOptionId,
        correctOptionId: q.correctOptionId,
        isCorrect,
        options: q.options,
      });
    }

    const totalQuestions = dbQuestions.length;
    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = scorePercentage >= quiz.passingScore;

    // 4. Save Attempt
    const [attempt] = await db
      .insert(quizAttempts)
      .values({
        quizId,
        studentId,
        score: scorePercentage,
        passed,
        answers,
        infractionCount,
        isFlaggedForAudit: infractionCount > 3,
      })
      .returning();

    return {
      attemptId: attempt.id,
      score: scorePercentage,
      passed,
      passingScore: quiz.passingScore,
      correctCount,
      totalQuestions,
      details,
      quizTitle: quiz.title,
    };
  }
}
