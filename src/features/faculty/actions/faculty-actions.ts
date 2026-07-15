"use server";

import { db } from "@/db/db";
import { projectSubmissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { getTenantContext } from "@/features/auth/services/tenant";
import { FacultyRepository } from "../repository/faculty-repository";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const liveClassSchema = z.object({
  moduleId: z.string().uuid("Invalid module identifier."),
  title: z.string().min(3, "Title must be at least 3 characters."),
  zoomMeetingId: z.string().min(5, "Zoom Meeting ID is required."),
  zoomPasscode: z.string().min(3, "Zoom Passcode is required."),
});

export async function getBatchRosterAction(batchId: string) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Faculty", "Mentor", "Program Manager"]);
    const tenant = await getTenantContext();
    if (!tenant) {
      return { success: false, error: "Tenant context not found." };
    }
    const roster = await FacultyRepository.getBatchRoster(tenant.id, batchId);
    return { success: true, data: roster };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load roster." };
  }
}

export async function scheduleLiveClassAction(formData: {
  moduleId: string;
  title: string;
  zoomMeetingId: string;
  zoomPasscode: string;
}) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Faculty", "Mentor", "Program Manager"]);
    verifyWriteAccess(user);

    const parsed = liveClassSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const tenant = await getTenantContext();
    if (!tenant) {
      return { success: false, error: "Tenant context not found." };
    }

    const lesson = await FacultyRepository.scheduleLiveClass(
      tenant.id,
      parsed.data.moduleId,
      parsed.data.title,
      parsed.data.zoomMeetingId,
      parsed.data.zoomPasscode
    );

    revalidatePath("/dashboard");
    revalidatePath("/courses/[courseId]", "page");

    return { success: true, data: lesson };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to schedule live class." };
  }
}

export async function getStudentProfileStatsAction(studentId: string) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Faculty", "Mentor", "Program Manager"]);
    const tenant = await getTenantContext();

    if (!tenant) {
      return { success: false, error: "Tenant context not found." };
    }
    const stats = await FacultyRepository.getStudentProfileStats(tenant.id, studentId);
    return { success: true, data: stats };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load student profile statistics." };
  }
}

export async function gradeProjectSubmissionAction(
  submissionId: string,
  payload: {
    status: "approved" | "failed";
    score: number;
    feedback: string;
  }
) {
  try {
    const user = await requireAuth();
    verifyWriteAccess(user);
    if (!["Faculty", "Mentor", "Owner", "Admin"].includes(user.role)) {
      return { success: false, error: "Unauthorized: Only faculty members can grade projects." };
    }

    if (payload.score < 0 || payload.score > 100) {
      return { success: false, error: "Score must be between 0 and 100." };
    }

    // Update the submission
    await db
      .update(projectSubmissions)
      .set({
        status: payload.status,
        grade: payload.score.toString(),
        feedback: payload.feedback,
      })
      .where(eq(projectSubmissions.id, submissionId));

    revalidatePath("/faculty");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update project submission grade." };
  }
}
