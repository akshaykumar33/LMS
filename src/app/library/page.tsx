import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { db } from "@/db/db";
import { students, users, digitalLibrary } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DigitalLibraryClient } from "@/features/library/components/DigitalLibraryClient";

export default async function DigitalLibraryPage() {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  // Feature Flag Guard: check if Digital Library is enabled
  const enableLibrary = tenant.settings?.features?.enableLibrary !== false;
  if (!enableLibrary) {
    redirect("/dashboard");
  }
  
  const user = await requireAuth();

  // Load student profile details if student
  let studentProfile = undefined;
  if (user.role === "Student") {
    studentProfile = await db.query.students.findFirst({
      where: eq(students.userId, user.userId),
      with: {
        batch: true,
      },
    });
    if (!studentProfile) redirect("/dashboard");
  }

  const libraryItems = await db.query.digitalLibrary.findMany({
    where: eq(digitalLibrary.tenantId, tenant.id)
  });

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.userId),
  });

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "User",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
  };

  return (
    <DashboardLayout user={userData} tenant={tenant} studentProfile={studentProfile}>
      <DigitalLibraryClient
        items={libraryItems}
        userRole={user.role}
        primaryColor={tenant.branding?.primaryColor}
      />
    </DashboardLayout>
  );
}
