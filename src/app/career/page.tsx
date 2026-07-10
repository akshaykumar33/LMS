import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { getAncestorChain } from "@/features/auth/services/is-parent-tenant";
import { CareerRepository } from "@/features/career/repository/career-repository";
import { db } from "@/db/db";
import { students, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AnalyticsRepository } from "@/features/analytics/repository/analytics-repository";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StudentCareerPortal } from "@/features/career/components/StudentCareerPortal";

export default async function CareerPage() {
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

  // Fetch student completed courses
  const progress = await AnalyticsRepository.getStudentProgressSummary(tenant.id, studentProfile.batchId, studentProfile.id);
  const completedCourses = progress
    .filter((p: any) => p.hasPassed)
    .map((p: any) => ({ name: p.name, code: p.code }));

  // Fetch active jobs and student's applications
  const jobs = await CareerRepository.getJobPostings(tenant.id, true);
  
  // Fetch student applications
  const rawApps = await CareerRepository.getStudentApplications(tenant.id, studentProfile.id);
  
  // Map type structure to fit StudentApplication interface
  const applications = rawApps.map((app: any) => ({
    id: app.id,
    jobId: app.jobId,
    status: app.status,
    resumeUrl: app.resumeUrl,
    createdAt: app.createdAt,
    job: {
      title: app.job?.title || "Unknown Position",
      company: app.job?.company || "Unknown Company"
    }
  }));

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
