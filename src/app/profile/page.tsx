import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { db } from "@/db/db";
import { students, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProfileClient } from "@/features/profile/components/ProfileClient";
import { AnalyticsRepository } from "@/features/analytics/repository/analytics-repository";

export default async function StudentProfilePage() {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  const user = await requireAuth();

  // Role guards first — before any DB lookups that require a students record
  if (["Faculty", "Mentor"].includes(user.role)) redirect("/faculty");
  if (["Owner", "Admin", "Program Manager"].includes(user.role)) redirect("/admin/admissions");
  if (user.role === "Placement Officer") redirect("/admin/placement");
  if (["SuperAdmin", "Owner"].includes(user.role)) redirect("/super-admin");

  // Load student profile scoped to this tenant
  const studentProfile = await db.query.students.findFirst({
    where: and(eq(students.userId, user.userId), eq(students.tenantId, tenant.id)),
    with: { batch: true },
  });

  if (!studentProfile) redirect("/dashboard");

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

  const gamification = await AnalyticsRepository.getStudentGamification(studentProfile.id);

  return (
    <DashboardLayout user={userData} tenant={tenant} studentProfile={studentProfile}>
      <ProfileClient
        user={userData}
        tenant={tenant}
        studentProfile={studentProfile}
        gamification={gamification}
      />
    </DashboardLayout>
  );
}
