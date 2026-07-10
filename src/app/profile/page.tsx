import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { getAncestorChain } from "@/features/auth/services/is-parent-tenant";
import { db } from "@/db/db";
import { students, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProfileClient } from "@/features/profile/components/ProfileClient";

export default async function StudentProfilePage() {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  const user = await requireAuth();

  // Load student profile details
  const studentProfile = await db.query.students.findFirst({
    where: eq(students.userId, user.userId),
    with: {
      batch: true,
    },
  });

  if (!studentProfile) {
    redirect("/dashboard");
  }

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

  // Root/Tenant-level management roles should land on their portal home, not student pages
  const chain = await getAncestorChain(tenant.id);
  if (chain.length <= 2 && ["SuperAdmin", "Owner"].includes(user.role)) {
    redirect("/");
  }

  if (user.role === "SuperAdmin") {
    redirect("/admin/admissions");
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
      <ProfileClient 
        user={userData} 
        tenant={tenant} 
        studentProfile={studentProfile} 
      />
    </DashboardLayout>
  );
}
