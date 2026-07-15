import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { CourseRepository } from "@/features/course/repository/course-repository";
import { db } from "@/db/db";
import { students, users, courses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CoursesListClient } from "@/features/course/components/CoursesListClient";

export default async function CoursesPage() {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  const user = await requireAuth();

  // Redirect non-student roles that are completely restricted
  if (user.role === "Placement Officer") redirect("/admin/placement");

  let studentProfile: any = null;
  if (user.role === "Student") {
    studentProfile = await db.query.students.findFirst({
      where: and(eq(students.userId, user.userId), eq(students.tenantId, tenant.id)),
      with: { batch: true },
    });

    if (!studentProfile) redirect("/dashboard");
  }

  // Fetch courses with full module/lesson detail so we can show lesson counts
  const coursesRaw = studentProfile 
    ? await CourseRepository.getCoursesByBatch(tenant.id, studentProfile.batchId)
    : (["SuperAdmin", "Owner", "Admin", "Program Manager", "Faculty", "Mentor"].includes(user.role)
        ? await db.query.courses.findMany({ where: eq(courses.tenantId, tenant.id) })
        : []);

  // For each course, load module+lesson structure for counts
  const coursesWithDetails = await Promise.all(
    coursesRaw.map(async (course: any) => {
      const details = await CourseRepository.getCourseDetails(tenant.id, course.id);
      const moduleCount = details?.modules.length || 0;
      const lessonCount = details?.modules.reduce((acc: number, m: any) => acc + m.lessons.length, 0) || 0;
      return {
        ...course,
        moduleCount,
        lessonCount,
        syllabus: details?.syllabus || null,
      };
    })
  );

  // Fetch all available courses for the tenant to show in elective catalog
  const allAvailableRaw = await db.query.courses.findMany({
    where: eq(courses.tenantId, tenant.id),
  });

  const allAvailableCourses = await Promise.all(
    allAvailableRaw.map(async (course: any) => {
      const details = await CourseRepository.getCourseDetails(tenant.id, course.id);
      const moduleCount = details?.modules.length || 0;
      const lessonCount = details?.modules.reduce((acc: number, m: any) => acc + m.lessons.length, 0) || 0;
      return {
        ...course,
        moduleCount,
        lessonCount,
        syllabus: details?.syllabus || null,
      };
    })
  );

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.userId),
  });

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Student",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
  };

  return (
    <DashboardLayout user={userData} tenant={tenant} studentProfile={studentProfile}>
      <CoursesListClient
        courses={coursesWithDetails}
        allAvailableCourses={allAvailableCourses}
        batchName={studentProfile?.batch?.name || "Sandbox Cohort"}
        primaryColor={tenant.branding?.primaryColor || "#0ea5e9"}
        userRole={user.role}
      />
    </DashboardLayout>
  );
}
