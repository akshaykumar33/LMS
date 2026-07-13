import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { getAncestorChain } from "@/features/auth/services/is-parent-tenant";
import { db, dbSubdomainStorage } from "@/db/db";
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
    if (tenant.isPlacementEnabled) {
      redirect("/admin/placement");
    } else {
      redirect("/");
    }
  }

  if (["SuperAdmin", "Owner"].includes(user.role)) {
    redirect("/super-admin");
  }

  // Retrieve the ancestor chain to determine the tenant level
  const chain = await getAncestorChain(tenant.id);

  // Root Platform (Wysbryx) or Tenant (Virginia Tech):
  // Admin/PM at tenant level or sub-company level get an admin panel
  if (["Admin", "Program Manager"].includes(user.role)) {
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

  const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
    await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    })
  );

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Student",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
    subdomain: user.subdomain,
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
