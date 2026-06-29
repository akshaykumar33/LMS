import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
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

  if (user.role === "SuperAdmin") {
    redirect("/super-admin");
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
