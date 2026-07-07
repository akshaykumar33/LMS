import { db } from "@/db/db";
import { courses, courseBatches, modules, lessons } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

export class CourseRepository {
  /**
   * Retrieves all courses mapped to a specific batch, scoped by tenant.
   */
  static async getCoursesByBatch(tenantId: string, batchId: string) {
    const records = await db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        description: courses.description,
      })
      .from(courseBatches)
      .innerJoin(courses, eq(courseBatches.courseId, courses.id))
      .where(
        and(
          eq(courses.tenantId, tenantId),
          eq(courseBatches.batchId, batchId)
        )
      );

    return records;
  }

  /**
   * Retrieves a course with its modules and lessons, ordered by their sequence fields.
   */
  static async getCourseDetails(tenantId: string, courseId: string) {
    // 1. Fetch Course metadata
    const [course] = await db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.id, courseId),
          eq(courses.tenantId, tenantId)
        )
      );

    if (!course) return null;

    // 2. Fetch Modules ordered
    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.order));

    // 3. Fetch Lessons for each module
    const modulesWithLessons: any[] = [];
    for (const mod of courseModules) {
      const modLessons = await db
        .select()
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id))
        .orderBy(asc(lessons.order));

      modulesWithLessons.push({
        ...mod,
        lessons: modLessons,
      });
    }

    return {
      ...course,
      modules: modulesWithLessons,
    };
  }

  /**
   * Retrieves details of a single lesson, verifying it belongs to the correct tenant.
   */
  static async getLesson(tenantId: string, lessonId: string) {
    const [record] = await db
      .select({
        lesson: lessons,
        moduleId: modules.id,
        courseId: courses.id,
      })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(
        and(
          eq(lessons.id, lessonId),
          eq(courses.tenantId, tenantId)
        )
      );

    if (!record) return null;

    return record.lesson;
  }

  /**
   * Retrieves all courses for a given tenant, including their modules and lessons.
   */
  static async getAllCourses(tenantId: string | string[]) {
    const condition = Array.isArray(tenantId)
      ? inArray(courses.tenantId, tenantId)
      : eq(courses.tenantId, tenantId);

    const list = await db
      .select()
      .from(courses)
      .where(condition)
      .orderBy(courses.code);

    const detailedList: any[] = [];
    for (const c of list) {
      const courseModules = await db
        .select()
        .from(modules)
        .where(eq(modules.courseId, c.id))
        .orderBy(asc(modules.order));

      const modulesWithLessons: any[] = [];
      for (const mod of courseModules) {
        const modLessons = await db
          .select({
            id: lessons.id,
            title: lessons.title,
            contentType: lessons.contentType,
            content: lessons.content,
            videoUrl: lessons.videoUrl,
            order: lessons.order,
          })
          .from(lessons)
          .where(eq(lessons.moduleId, mod.id))
          .orderBy(asc(lessons.order));

        modulesWithLessons.push({
          ...mod,
          lessons: modLessons,
        });
      }

      detailedList.push({
        ...c,
        modules: modulesWithLessons,
      });
    }

    return detailedList;
  }
}
