"use server";

import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
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
    const roster = await FacultyRepository.getBatchRoster(user.tenantId, batchId);
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

    const lesson = await FacultyRepository.scheduleLiveClass(
      user.tenantId,
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
    const stats = await FacultyRepository.getStudentProfileStats(user.tenantId, studentId);
    return { success: true, data: stats };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load student profile statistics." };
  }
}
