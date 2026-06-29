import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { db } from "@/db/db";
import { students, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GuestSandboxBanner } from "@/components/GuestSandboxBanner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardClient } from "@/features/dashboard/components/DashboardClient";
import { CourseRepository } from "@/features/course/repository/course-repository";

export default async function DashboardPage() {
  const tenant = await getTenantContext();
  if (!tenant) {
    redirect("/");
  }

  const user = await requireAuth();

  // Redirect admin/staff roles to their respective dashboards
  if (["Faculty", "Mentor"].includes(user.role)) {
    redirect("/faculty");
  }

  if (["Owner", "Admin", "Program Manager"].includes(user.role)) {
    redirect("/admin/admissions");
  }

  if (user.role === "Placement Officer") {
    redirect("/admin/placement");
  }

  if (user.role === "SuperAdmin") {
    redirect("/super-admin");
  }

  // Load student profile and courses if role is Student
  let studentProfile: any = null;
  let studentCourses: any[] = [];
  
  if (user.role === "Student") {
    studentProfile = await db.query.students.findFirst({
      where: eq(students.userId, user.userId),
      with: {
        batch: true,
      },
    });

    if (studentProfile) {
      studentCourses = await CourseRepository.getCoursesByBatch(tenant.id, studentProfile.batchId);
    }
  }

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
      <GuestSandboxBanner role={user.role} />
      <DashboardClient 
        user={userData} 
        tenant={tenant} 
        studentProfile={studentProfile} 
        courses={studentCourses} 
      />
    </DashboardLayout>
  );
}
