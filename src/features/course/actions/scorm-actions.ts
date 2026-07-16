"use server";

import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { revalidatePath } from "next/cache";

export async function saveScormAttemptAction(lessonId: string, scormData: any) {
  try {
    const user = await requireAuth(["Student"]);
    verifyWriteAccess(user);

    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    // Determine completion status based on SCORM variables
    // SCORM 1.2: cmi.core.lesson_status ("completed", "passed", "failed", "browsed", "incomplete")
    // SCORM 2004: cmi.completion_status ("completed", "incomplete", "unknown") and cmi.success_status ("passed", "failed", "unknown")
    const lessonStatus = scormData["cmi.core.lesson_status"] || scormData["cmi.completion_status"] || "";
    const successStatus = scormData["cmi.success_status"] || "";
    
    const isCompleted = 
      lessonStatus.toLowerCase() === "completed" || 
      lessonStatus.toLowerCase() === "passed" || 
      successStatus.toLowerCase() === "passed";

    // Find existing progress
    const existing = await db.query.lessonProgress.findFirst({
      where: and(
        eq(schema.lessonProgress.studentId, student.id),
        eq(schema.lessonProgress.lessonId, lessonId)
      ),
    });

    if (existing) {
      // Merge new scormData with existing scormData to avoid losing fields
      const mergedScormData = {
        ...(existing.scormData || {}),
        ...scormData,
      };

      await db
        .update(schema.lessonProgress)
        .set({
          completed: existing.completed || isCompleted,
          scormData: mergedScormData,
          updatedAt: new Date(),
        })
        .where(eq(schema.lessonProgress.id, existing.id));
    } else {
      await db.insert(schema.lessonProgress).values({
        studentId: student.id,
        lessonId,
        completed: isCompleted,
        scormData: scormData,
        updatedAt: new Date(),
      });
    }

    revalidatePath(`/courses/[courseId]`, "page");
    revalidatePath("/dashboard");
    revalidatePath("/courses");
    revalidatePath("/progress");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save SCORM progress." };
  }
}

export async function getScormProgressAction(lessonId: string) {
  try {
    const user = await requireAuth(["Student"]);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    const progress = await db.query.lessonProgress.findFirst({
      where: and(
        eq(schema.lessonProgress.studentId, student.id),
        eq(schema.lessonProgress.lessonId, lessonId)
      ),
    });

    return { success: true, data: progress?.scormData || {} };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to retrieve SCORM progress." };
  }
}

export async function saveScormCourseAttemptAction(courseId: string, scormData: any) {
  try {
    const user = await requireAuth(["Student"]);
    verifyWriteAccess(user);

    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    const lessonStatus = scormData["cmi.core.lesson_status"] || scormData["cmi.completion_status"] || "";
    const successStatus = scormData["cmi.success_status"] || "";
    
    const isCompleted = 
      lessonStatus.toLowerCase() === "completed" || 
      lessonStatus.toLowerCase() === "passed" || 
      successStatus.toLowerCase() === "passed";

    // Find existing progress
    const existing = await db.query.courseProgress.findFirst({
      where: and(
        eq(schema.courseProgress.studentId, student.id),
        eq(schema.courseProgress.courseId, courseId)
      ),
    });

    if (existing) {
      const mergedScormData = {
        ...(existing.scormData || {}),
        ...scormData,
      };

      await db
        .update(schema.courseProgress)
        .set({
          completed: existing.completed || isCompleted,
          scormData: mergedScormData,
          updatedAt: new Date(),
        })
        .where(eq(schema.courseProgress.id, existing.id));
    } else {
      await db.insert(schema.courseProgress).values({
        studentId: student.id,
        courseId,
        completed: isCompleted,
        scormData: scormData,
        updatedAt: new Date(),
      });
    }

    revalidatePath(`/courses/[courseId]`, "page");
    revalidatePath("/dashboard");
    revalidatePath("/courses");
    revalidatePath("/progress");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save course SCORM progress." };
  }
}

export async function getScormCourseProgressAction(courseId: string) {
  try {
    const user = await requireAuth(["Student"]);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    const progress = await db.query.courseProgress.findFirst({
      where: and(
        eq(schema.courseProgress.studentId, student.id),
        eq(schema.courseProgress.courseId, courseId)
      ),
    });

    return { success: true, data: progress?.scormData || {} };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to retrieve course SCORM progress." };
  }
}
