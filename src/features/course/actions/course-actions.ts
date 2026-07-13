"use server";

import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { CourseRepository } from "../repository/course-repository";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
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
    fileUrl?: string;
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
        fileUrl: formData.fileUrl !== undefined ? formData.fileUrl : lesson.fileUrl,
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

/**
 * Elective Catalog Action: self-enroll in an elective course.
 */
export async function enrollStudentInElectiveAction(courseId: string) {
  try {
    const user = await requireAuth(["Student"]);
    verifyWriteAccess(user);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    // Verify batch association exists
    if (!student.batchId) {
      return { success: false, error: "No batch assigned to student." };
    }

    // Check if link already exists
    const existing = await db.query.courseBatches.findFirst({
      where: and(
        eq(schema.courseBatches.courseId, courseId),
        eq(schema.courseBatches.batchId, student.batchId)
      ),
    });

    if (!existing) {
      await db.insert(schema.courseBatches).values({
        courseId,
        batchId: student.batchId,
      });
    }

    revalidatePath("/courses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to self-enroll in elective." };
  }
}

/**
 * Lesson Completion Action: toggle completed state for student.
 */
export async function toggleLessonCompletionAction(lessonId: string, completed: boolean) {
  try {
    const user = await requireAuth(["Student"]);
    verifyWriteAccess(user);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    // Check if progress entry already exists
    const existing = await db.query.lessonProgress.findFirst({
      where: and(
        eq(schema.lessonProgress.studentId, student.id),
        eq(schema.lessonProgress.lessonId, lessonId)
      ),
    });

    if (existing) {
      await db
        .update(schema.lessonProgress)
        .set({
          completed,
          updatedAt: new Date(),
        })
        .where(eq(schema.lessonProgress.id, existing.id));
    } else {
      await db.insert(schema.lessonProgress).values({
        studentId: student.id,
        lessonId,
        completed,
        updatedAt: new Date(),
      });
    }

    revalidatePath(`/courses/[courseId]`, "page");
    revalidatePath("/dashboard");
    revalidatePath("/progress");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update lesson progress." };
  }
}

/**
 * Capstone Project Action: submit Git repository and documentation link.
 */
export async function submitProjectAction(projectId: string, gitRepoUrl: string, documentationUrl: string) {
  try {
    const user = await requireAuth(["Student"]);
    verifyWriteAccess(user);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    // Check if a submission already exists
    const existing = await db.query.projectSubmissions.findFirst({
      where: and(
        eq(schema.projectSubmissions.projectId, projectId),
        eq(schema.projectSubmissions.studentId, student.id)
      ),
    });

    if (existing) {
      await db
        .update(schema.projectSubmissions)
        .set({
          gitRepoUrl,
          documentationUrl,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(schema.projectSubmissions.id, existing.id));
    } else {
      await db.insert(schema.projectSubmissions).values({
        tenantId: user.tenantId,
        projectId,
        studentId: student.id,
        gitRepoUrl,
        documentationUrl,
        status: "pending",
        submittedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    revalidatePath(`/courses/[courseId]`, "page");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit capstone project." };
  }
}

/**
 * CMS Action: Create a new course under the active tenant context.
 * Enforces the maxCourses restriction check.
 */
export async function createCourseAction(formData: { name: string; code: string; description: string }) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
    verifyWriteAccess(user);

    if (!formData.name || !formData.code) {
      return { success: false, error: "Course name and code are required." };
    }

    // Check maxCourses restriction
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, user.tenantId),
    });

    if (tenant) {
      const maxCourses = (tenant.settings as any)?.restrictions?.maxCourses;
      if (maxCourses) {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.courses)
          .where(eq(schema.courses.tenantId, user.tenantId));
        const currentCoursesCount = Number(countResult[0]?.count || 0);
        if (currentCoursesCount >= Number(maxCourses)) {
          return {
            success: false,
            error: `The maximum course limit (${maxCourses}) for this tenant has been reached. Please upgrade your subscription.`
          };
        }
      }
    }

    const [newCourse] = await db
      .insert(schema.courses)
      .values({
        tenantId: user.tenantId,
        name: formData.name,
        code: formData.code,
        description: formData.description,
      })
      .returning();

    revalidatePath("/admin/courses");
    revalidatePath("/dashboard");
    return { success: true, data: newCourse };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create course." };
  }
}
