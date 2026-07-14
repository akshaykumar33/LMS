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

    let zoomMeetingId = formData.zoomMeetingId || lesson.zoomMeetingId;
    let zoomPasscode = formData.zoomPasscode || lesson.zoomPasscode;
    let videoUrl = formData.videoUrl;
    const contentType = formData.contentType || lesson.contentType;

    if (contentType === "live_class" && !zoomMeetingId) {
      try {
        const { createZoomMeeting } = require("../services/zoom-service");
        const startTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const meeting = await createZoomMeeting(user.tenantId, formData.title, startTime, 60);
        if (meeting) {
          zoomMeetingId = meeting.meetingId;
          zoomPasscode = meeting.passcode;
          videoUrl = meeting.joinUrl;
        }
      } catch (zoomError) {
        console.error("Zoom auto-scheduling failed:", zoomError);
      }
    }

    await db
      .update(schema.lessons)
      .set({
        title: formData.title,
        content: formData.content, // serves as transcript/notes content
        videoUrl: videoUrl,
        contentType: contentType,
        zoomMeetingId: zoomMeetingId,
        zoomPasscode: zoomPasscode,
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

    if (completed) {
      try {
        const { sendXapiStatement } = require("@/features/analytics/services/xapi-service");
        const lessonInfo = await db.query.lessons.findFirst({
          where: eq(schema.lessons.id, lessonId),
        });
        const { headers } = require("next/headers");
        const headersList = await headers();
        const host = headersList.get("host") || "wysbryx.com";
        const proto = headersList.get("x-forwarded-proto") || "https";
        const baseUrl = `${proto}://${host}`;

        if (lessonInfo) {
          await sendXapiStatement(user.tenantId, {
            actorEmail: user.email,
            actorName: student.fullName || user.email,
            verbId: "http://adlnet.gov/expapi/verbs/completed",
            verbDisplay: "completed",
            activityId: `${baseUrl}/activities/lessons/${lessonId}`,
            activityName: lessonInfo.title,
            resultCompletion: true,
          });
        }
      } catch (e) {
        console.error("Failed to dispatch xAPI statement for lesson:", e);
      }
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

export async function askAiAction(lessonId: string, query: string, botType: "tutor" | "book" | "score" = "tutor") {
  try {
    const user = await requireAuth();
    if (!user) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    if (botType === "book") {
      const items = await db.query.digitalLibrary.findMany({
        where: eq(schema.digitalLibrary.tenantId, user.tenantId),
      });

      const normalizedQuery = query.toLowerCase();
      const matched = items.filter(item => 
        item.title.toLowerCase().includes(normalizedQuery) ||
        (item.author && item.author.toLowerCase().includes(normalizedQuery)) ||
        (item.description && item.description.toLowerCase().includes(normalizedQuery)) ||
        item.category.toLowerCase().includes(normalizedQuery)
      );

      if (matched.length === 0) {
        return {
          success: true,
          data: {
            text: `📚 **Book Bot Librarian**: I searched the digital library catalog for "${query}" but found no matching titles.

Here are some general resources available in your tenant library:
${items.slice(0, 3).map(item => `- **${item.title}** by ${item.author || "Unknown"} (${item.category}) [Download Link](${item.fileUrl})`).join("\n")}

Try searching for terms like "CMOS", "FinFET", "EUV", or "Lithography".`
          }
        };
      }

      return {
        success: true,
        data: {
          text: `📚 **Book Bot Librarian**: I found ${matched.length} matching resources in the digital library matching your query "${query}":

${matched.map(item => `• **${item.title}**
  *Author*: ${item.author || "Unknown"} | *Category*: ${item.category}
  *Overview*: ${item.description || "No description provided."}
  🔗 [Access Resource Document](${item.fileUrl})`).join("\n\n")}

Let me know if you would like me to explain any of these references or summarize their contents!`
        }
      };
    }

    if (botType === "score") {
      const student = await db.query.students.findFirst({
        where: eq(schema.students.userId, user.userId),
        with: {
          batch: true,
        }
      });

      if (!student) {
        return {
          success: true,
          data: {
            text: `🎯 **Score Bot**: I could not retrieve a student score profile for your user role (${user.role}). Score Bot analytics are only active for enrolled student profiles.`
          }
        };
      }

      const attempts = await db.query.quizAttempts.findMany({
        where: eq(schema.quizAttempts.studentId, student.id),
      });

      const progress = await db.query.lessonProgress.findMany({
        where: eq(schema.lessonProgress.studentId, student.id),
      });

      const totalLessons = 6;
      const completedCount = progress.filter(p => p.completed).length;
      const progressPercent = Math.round((completedCount / totalLessons) * 100);

      const totalQuizzes = attempts.length;
      const passedQuizzes = attempts.filter(a => a.passed).length;
      const averageScore = totalQuizzes > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / totalQuizzes) 
        : 0;

      const totalInfractions = attempts.reduce((sum, a) => sum + (a.infractionCount || 0), 0);
      const isFlagged = attempts.some(a => a.isFlaggedForAudit);

      let recommendation = "Keep moving through your study modules! You are doing great.";
      if (averageScore > 0 && averageScore < 70) {
        recommendation = "Your average quiz score is below 70%. We recommend using the AI Tutor Bot to review the Timing Analysis & Static Slack lessons.";
      } else if (completedCount < 3) {
        recommendation = "You have completed less than 3 lessons. Focus on finishing Module 1 lessons and taking the foundations assessment.";
      } else if (totalInfractions > 1) {
        recommendation = "Warning: Multiple proctoring infractions detected during your assessments. Please ensure your camera remains aligned to avoid flags.";
      }

      const scoreReport = `🎯 **Score Bot Report Card**
--------------------------------------------------
👤 **Student**: ${user.firstName} ${user.lastName || ""}
🎫 **Roll Number**: ${student.rollNumber}
📈 **Roadmap Progress**: ${completedCount}/${totalLessons} lessons completed (${progressPercent}%)
📝 **Quizzes Attempted**: ${totalQuizzes} | Passed: ${passedQuizzes}
📊 **Average Quiz Score**: ${averageScore}%
🛡️ **Proctor Integrity Status**: ${totalInfractions} warnings (${isFlagged ? "⚠️ FLAG AUDIT" : "✅ CLEAR"})

💡 **AI Coach Recommendation**:
${recommendation}`;

      return {
        success: true,
        data: {
          text: scoreReport
        }
      };
    }

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
      return { success: false, error: "Lesson context not found or unauthorized." };
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, user.tenantId),
    });
    if (tenant && (tenant.settings as any)?.ai?.enableAi === false) {
      return { success: false, error: "AI assistant is disabled by the administrator." };
    }

    const { getAiCompletionForTenant } = await import("../services/ai-service");
    const result = await getAiCompletionForTenant(
      user.tenantId,
      lesson.title,
      lesson.content || "",
      query
    );

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to query AI Assistant." };
  }
}

export async function saveVideoProgressAction(lessonId: string, currentSeconds: number, duration: number) {
  try {
    const user = await requireAuth(["Student"]);
    verifyWriteAccess(user);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });

    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    const percentage = Math.round((currentSeconds / duration) * 100);

    // Check if progress entry already exists
    const existing = await db.query.lessonProgress.findFirst({
      where: and(
        eq(schema.lessonProgress.studentId, student.id),
        eq(schema.lessonProgress.lessonId, lessonId)
      ),
    });

    const videoProgressData = {
      videoProgress: {
        currentSeconds,
        duration,
        percentage,
      }
    };

    if (existing) {
      // Merge existing scormData
      const prevData = (existing.scormData as any) || {};
      await db
        .update(schema.lessonProgress)
        .set({
          scormData: {
            ...prevData,
            ...videoProgressData,
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.lessonProgress.id, existing.id));
    } else {
      await db.insert(schema.lessonProgress).values({
        studentId: student.id,
        lessonId,
        completed: false,
        scormData: videoProgressData,
        updatedAt: new Date(),
      });
    }

    return { success: true, percentage };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update video progress." };
  }
}

export async function getVideoProgressAction(lessonId: string) {
  try {
    const user = await requireAuth(["Student"]);
    const student = await db.query.students.findFirst({
      where: eq(schema.students.userId, user.userId),
    });
    if (!student) return { success: false, error: "Not found" };

    const progress = await db.query.lessonProgress.findFirst({
      where: and(
        eq(schema.lessonProgress.studentId, student.id),
        eq(schema.lessonProgress.lessonId, lessonId)
      ),
    });

    if (progress && progress.scormData) {
      const data = progress.scormData as any;
      if (data.videoProgress) {
        return { success: true, currentSeconds: data.videoProgress.currentSeconds || 0 };
      }
    }
    return { success: true, currentSeconds: 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
