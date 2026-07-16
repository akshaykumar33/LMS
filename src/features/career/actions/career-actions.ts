"use server";

import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { CareerRepository } from "../repository/career-repository";
import { db } from "@/db/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const jobPostingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  company: z.string().min(2, "Company name is required."),
  description: z.string().min(10, "Description must be detailed."),
  requirements: z.string().min(10, "Requirements must be detailed."),
  salary: z.string().nullable().optional(),
  location: z.string().min(2, "Location is required."),
});

export async function applyToJobAction(jobId: string, resumeUrl: string) {
  try {
    const user = await requireAuth();
    verifyWriteAccess(user);

    // 1. Resolve student profile
    const [student] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, user.userId));

    if (!student) {
      return { success: false, error: "Only enrolled students can apply for jobs." };
    }

    if (!resumeUrl || !resumeUrl.startsWith("http")) {
      return { success: false, error: "Please provide a valid resume URL (Google Drive, Dropbox, etc.)." };
    }

    await CareerRepository.applyToJob(user.tenantId, student.id, jobId, resumeUrl);

    // Trigger Notification to student confirming application
    try {
      const { NotificationRepository } = require("@/features/notification/repository/notification-repository");
      const job = await CareerRepository.getJobDetails(user.tenantId, jobId);
      await NotificationRepository.createNotification(
        user.tenantId,
        user.userId,
        "Job Application Submitted",
        `Your application for "${job?.title}" at ${job?.company} has been received.`,
        "success"
      );
    } catch (e) {
      console.error("Failed to send job application notification:", e);
    }

    revalidatePath("/career");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit application." };
  }
}

export async function createJobPostingAction(formData: {
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary?: string;
  location: string;
}) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Faculty", "Mentor", "Program Manager"]);
    verifyWriteAccess(user);

    const parsed = jobPostingSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const job = await CareerRepository.createJobPosting(
      user.tenantId,
      parsed.data.title,
      parsed.data.company,
      parsed.data.description,
      parsed.data.requirements,
      parsed.data.salary ?? "",
      parsed.data.location
    );

    revalidatePath("/career");
    revalidatePath("/admin/placement");

    return { success: true, data: job };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create job posting." };
  }
}

export async function updateJobPostingAction(jobId: string, formData: any) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Program Manager", "Placement Officer"]);
    verifyWriteAccess(user);

    const parsed = jobPostingSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const job = await CareerRepository.updateJobPosting(user.tenantId, jobId, {
    
      title: parsed.data.title,
      company: parsed.data.company,
      description: parsed.data.description,
      requirements: parsed.data.requirements,
      salary: parsed.data.salary ?? "",
      location: parsed.data.location,
    });
    console.log("DB job after update", job);

    revalidatePath("/career");
    revalidatePath("/admin/placement");

    return { success: true, data: job };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update job posting." };
  }
}

export async function deleteJobPostingAction(jobId: string) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Program Manager", "Placement Officer"]);
    verifyWriteAccess(user);

    await CareerRepository.deleteJobPosting(user.tenantId, jobId);

    revalidatePath("/career");
    revalidatePath("/admin/placement");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete job posting." };
  }
}

export async function updateApplicationStatusAction(applicationId: string, status: string) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Faculty", "Mentor", "Program Manager"]);
    verifyWriteAccess(user);

    const updated = await CareerRepository.updateApplicationStatus(user.tenantId, applicationId, status);

    // Notify the student about the status update!
    try {
      const { NotificationRepository } = require("@/features/notification/repository/notification-repository");
      // Find the user ID of the student
      const [studentUser] = await db
        .select({ userId: students.userId })
        .from(students)
        .where(eq(students.id, updated.studentId));

      if (studentUser) {
        let title = "Placement Update";
        let message = `Your application status has been updated to "${status.toUpperCase()}".`;
        let type: "info" | "success" | "warning" | "alert" = "info";

        if (status === "offered") {
          title = "🎉 Job Offer Received!";
          message = `Congratulations! You have received a job offer. Check your email or contact placement services.`;
          type = "success";
        } else if (status === "interviewing") {
          title = "📅 Interview Scheduled";
          message = `Great news! You have been shortlisted for an interview. Prepare your technical resume.`;
          type = "success";
        } else if (status === "rejected") {
          title = "Placement Update";
          message = `Thank you for your interest. Unfortunately, the company decided to proceed with other candidates.`;
          type = "warning";
        }

        await NotificationRepository.createNotification(
          user.tenantId,
          studentUser.userId,
          title,
          message,
          type
        );
      }
    } catch (e) {
      console.error("Failed to notify student on status change:", e);
    }

    revalidatePath("/career");
    revalidatePath("/admin/placement");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update status." };
  }
}

export async function updateStudentResumeAction(resumeUrl: string) {
  try {
    const user = await requireAuth();
    verifyWriteAccess(user);

    if (!resumeUrl || !resumeUrl.startsWith("http")) {
      return { success: false, error: "Please provide a valid resume URL." };
    }

    const [student] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, user.userId));

    if (!student) {
      return { success: false, error: "No student profile found." };
    }

    await db
      .update(students)
      .set({ resumeUrl })
      .where(eq(students.id, student.id));

    revalidatePath("/dashboard");
    revalidatePath("/career");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update resume." };
  }
}
