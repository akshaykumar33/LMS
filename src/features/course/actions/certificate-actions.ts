"use server";

import { requireAuth } from "@/features/auth/services/session";
import { db } from "@/db/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CertificateRepository } from "../repository/certificate-repository";

/**
 * Server Action: Checks if a student is eligible for a course certificate,
 * and issues one if they qualify.
 */
export async function checkAndIssueCertificateAction(courseId: string) {
  try {
    const user = await requireAuth();

    // 1. Resolve student ID
    const [student] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, user.userId));

    if (!student) {
      return { success: false, error: "Authenticated user is not registered as a student." };
    }

    // 2. Try to issue certificate (this does the verification query inside)
    const cert = await CertificateRepository.issueCertificate(user.tenantId, student.id, courseId);
    
    return { success: true, certificateId: cert.id, certificateCode: cert.certificateCode };
  } catch (error: any) {
    // If they aren't eligible yet, we return success: false with the reason
    return { success: false, error: error.message || "Failed to process certificate." };
  }
}
