import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { getAncestorChain } from "@/features/auth/services/is-parent-tenant";
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

  // Redirect operational staff roles first — these work at ALL tenant levels
  if (["Faculty", "Mentor"].includes(user.role)) {
    redirect("/faculty");
  }
  if (user.role === "Placement Officer") {
    redirect("/admin/placement");
  }

  // Retrieve the ancestor chain to determine the tenant level
  const chain = await getAncestorChain(tenant.id);

  // Root Platform (Wysbryx) or Tenant (Virginia Tech):
  // Management roles (SuperAdmin/Owner) land on Portal Home to oversee their hierarchy.
  // Other admin roles at this level go to the admin panel.
  if (chain.length <= 2) {
    if (["SuperAdmin", "Owner"].includes(user.role)) {
      redirect("/");
    }
    // Admin/PM at tenant level still get an admin panel
    if (["Admin", "Program Manager"].includes(user.role)) {
      redirect("/admin/admissions");
    }
  }

  // Sub-Company / Institute level (chain >= 3): admin roles go to operational dashboard
  if (["Owner", "Admin", "Program Manager", "SuperAdmin"].includes(user.role)) {
    redirect("/admin/admissions");
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
