import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { AnalyticsRepository } from "@/features/analytics/repository/analytics-repository";
import { CertificateRepository } from "@/features/course/repository/certificate-repository";
import { db } from "@/db/db";
import { students, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProgressClient } from "@/features/analytics/components/ProgressClient";

export default async function ProgressPage() {
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

  if (!studentProfile) redirect("/dashboard");

  const history = await AnalyticsRepository.getStudentQuizHistory(studentProfile.id);
  const progress = await AnalyticsRepository.getStudentProgressSummary(user.tenantId, studentProfile.batchId, studentProfile.id);
  const earnedCertificates = await CertificateRepository.getStudentCertificates(tenant.id, studentProfile.id);

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
      <ProgressClient
        history={history}
        progress={progress}
        earnedCertificates={earnedCertificates}
        user={userData}
        tenant={tenant}
        studentProfile={studentProfile}
      />
    </DashboardLayout>
  );
}
