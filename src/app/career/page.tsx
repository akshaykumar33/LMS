import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { CareerRepository } from "@/features/career/repository/career-repository";
import { db, dbSubdomainStorage } from "@/db/db";
import { students, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AnalyticsRepository } from "@/features/analytics/repository/analytics-repository";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StudentCareerPortal } from "@/features/career/components/StudentCareerPortal";

export default async function CareerPage() {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  // Auth first — then check feature flags and roles
  const user = await requireAuth();

  // Redirect staff/admin roles away from student-only career page
  if (["Faculty", "Mentor"].includes(user.role)) redirect("/faculty");
  if (["Owner", "Admin", "Program Manager"].includes(user.role)) redirect("/admin/admissions");
  if (user.role === "Placement Officer") redirect("/admin/placement");
  if (["SuperAdmin", "Owner"].includes(user.role)) redirect("/super-admin");

  // Feature flag guard — after auth so we can show a meaningful error rather than a 404-style bounce
  if (!tenant.isPlacementEnabled) {
    redirect("/dashboard");
  }

  // Load student profile scoped to this tenant
  const studentProfile = await db.query.students.findFirst({
    where: and(eq(students.userId, user.userId), eq(students.tenantId, tenant.id)),
    with: { batch: true },
  });

  // Student with no profile record — probably a freshly created account not yet enrolled
  if (!studentProfile) redirect("/dashboard");

  // Fetch student completed courses
  const progress = await AnalyticsRepository.getStudentProgressSummary(
    tenant.id,
    studentProfile.batchId,
    studentProfile.id,
  );
  const completedCourses = progress
    .filter((p: any) => p.hasPassed)
    .map((p: any) => ({ name: p.name, code: p.code }));

  // Fetch active job postings and the student's applications
  const jobs = await CareerRepository.getJobPostings(tenant.id, true);
  const rawApps = await CareerRepository.getStudentApplications(tenant.id, studentProfile.id);
  const applications = rawApps.map((app: any) => ({
    id: app.id,
    jobId: app.jobId,
    status: app.status,
    resumeUrl: app.resumeUrl,
    createdAt: app.createdAt,
    job: {
      title: app.job?.title || "Unknown Position",
      company: app.job?.company || "Unknown Company",
    },
  }));

  const dbUser = await dbSubdomainStorage.run(user.subdomain || tenant.subdomain, async () =>
    db.query.users.findFirst({ where: eq(users.id, user.userId) })
  );

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Student",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
  };

  return (
    <DashboardLayout user={userData} tenant={tenant} studentProfile={studentProfile}>
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl lg:text-3xl font-black text-foreground">CoE Placement Portal</h1>
        <p className="text-xs text-muted-foreground">
          Apply to exclusive semiconductor engineering opportunities from our partner ecosystem.
        </p>
      </div>
      <StudentCareerPortal
        jobs={jobs}
        applications={applications}
        completedCourses={completedCourses}
      />
    </DashboardLayout>
  );
}
