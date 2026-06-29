import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { CourseRepository } from "@/features/course/repository/course-repository";
import { CourseManagerConsole } from "@/features/course/components/CourseManagerConsole";
import { GuestSandboxBanner } from "@/components/GuestSandboxBanner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { db } from "@/db/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminCoursesPage() {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);

  const rawCourses = await CourseRepository.getAllCourses(tenant.id);

  // Map courses to match component interfaces
  const formattedCourses = rawCourses.map((c: any) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description,
    modules: c.modules.map((m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      order: m.order,
      lessons: m.lessons.map((l: any) => ({
        id: l.id,
        title: l.title,
        contentType: l.contentType,
        content: l.content ?? null,
        videoUrl: l.videoUrl ?? null,
        order: l.order,
      })),
    })),
  }));

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.userId),
  });

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Admin",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
  };

  return (
    <DashboardLayout user={userData} tenant={tenant}>
      <GuestSandboxBanner role={user.role} />
      
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Curriculum CMS</h1>
          <p className="text-sm text-muted-foreground">
            Structure courses, assign module chapters, set video streaming resources, and transcript documentation.
          </p>
        </div>

        <CourseManagerConsole initialCourses={formattedCourses} primaryColor={tenant.branding?.primaryColor} />
      </div>
    </DashboardLayout>
  );
}
