"use server";

import { requireAuth } from "@/features/auth/services/session";
import { AnalyticsRepository } from "../repository/analytics-repository";
import { db } from "@/db/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getStudentProgressAction() {
  const user = await requireAuth();

  const [student] = await db
    .select({ id: students.id, batchId: students.batchId })
    .from(students)
    .where(eq(students.userId, user.userId));

  if (!student) return { success: false, error: "No student profile." };

  const history = await AnalyticsRepository.getStudentQuizHistory(student.id);
  const progress = await AnalyticsRepository.getStudentProgressSummary(user.tenantId, student.batchId, student.id);

  return { success: true, data: { history, progress } };
}

export async function getTenantAnalyticsAction() {
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  const stats = await AnalyticsRepository.getTenantAnalytics(user.tenantId);
  return { success: true, data: stats };
}
