"use server";

import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { CourseRepository } from "../repository/course-repository";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCourseDetailsAction(courseId: string) {
  try {
    const user = await requireAuth();
    if (!user) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    const details = await CourseRepository.getCourseDetails(user.tenantId, courseId);
    if (!details) {
      return { success: false, error: "Course not found." };
    }

    return { success: true, data: details };
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

export async function getLessonAction(lessonId: string) {
  try {
    const user = await requireAuth();
    if (!user) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    const lesson = await CourseRepository.getLesson(user.tenantId, lessonId);
    if (!lesson) {
      return { success: false, error: "Lesson not found." };
    }

    return { success: true, data: lesson };
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

/**
 * CMS Action: Update course name, code, description.
 */
export async function updateCourseAction(courseId: string, formData: { name: string; code: string; description: string }) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
    verifyWriteAccess(user);

    // Verify course belongs to tenant
    const course = await db.query.courses.findFirst({
      where: and(
        eq(schema.courses.id, courseId),
        eq(schema.courses.tenantId, user.tenantId)
      ),
    });

    if (!course) {
      return { success: false, error: "Course not found." };
    }

    await db
      .update(schema.courses)
      .set({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        updatedAt: new Date(),
      })
      .where(eq(schema.courses.id, courseId));

    revalidatePath("/admin/courses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update course." };
  }
}

/**
 * CMS Action: Update module name and description.
 */
export async function updateModuleAction(moduleId: string, formData: { name: string; description: string }) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
    verifyWriteAccess(user);

    // Verify module's course belongs to tenant
    const mod = await db.query.modules.findFirst({
      where: eq(schema.modules.id, moduleId),
      with: {
        course: true,
      },
    });

    if (!mod || mod.course.tenantId !== user.tenantId) {
      return { success: false, error: "Module not found or unauthorized." };
    }

    await db
      .update(schema.modules)
      .set({
        name: formData.name,
        description: formData.description,
        updatedAt: new Date(),
      })
      .where(eq(schema.modules.id, moduleId));

    revalidatePath("/admin/courses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update module." };
  }
}

/**
 * CMS Action: Update lesson properties (title, transcript content, videoUrl, order).
 */
export async function updateLessonAction(
  lessonId: string,
  formData: {
    title: string;
    content: string;
    videoUrl: string;
    contentType?: string;
    zoomMeetingId?: string;
    zoomPasscode?: string;
  }
) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Program Manager", "Faculty"]);
    verifyWriteAccess(user);

    // Verify lesson's module and course belong to tenant
    const lesson = await db.query.lessons.findFirst({
      where: eq(schema.lessons.id, lessonId),
      with: {
        module: {
          with: {
            course: true,
          },
        },
      },
    });

    if (!lesson || lesson.module.course.tenantId !== user.tenantId) {
      return { success: false, error: "Lesson not found or unauthorized." };
    }

    await db
      .update(schema.lessons)
      .set({
        title: formData.title,
        content: formData.content, // serves as transcript/notes content
        videoUrl: formData.videoUrl,
        contentType: formData.contentType || lesson.contentType,
        zoomMeetingId: formData.zoomMeetingId || lesson.zoomMeetingId,
        zoomPasscode: formData.zoomPasscode || lesson.zoomPasscode,
        updatedAt: new Date(),
      })
      .where(eq(schema.lessons.id, lessonId));

    revalidatePath("/admin/courses");
    revalidatePath("/dashboard");
    revalidatePath("/courses/[courseId]", "page");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update lesson." };
  }
}
