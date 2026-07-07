import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { GuestSandboxBanner } from "@/components/GuestSandboxBanner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CareerRepository } from "@/features/career/repository/career-repository";
import { PlacementConsole } from "@/features/career/components/PlacementConsole";
import { db } from "@/db/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminPlacementPage() {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  const user = await requireAuth(["Owner", "Admin", "Faculty", "Mentor", "Program Manager", "Placement Officer"]);

  // Fetch all jobs (active + inactive)
  const jobs = await CareerRepository.getJobPostings(user.tenantId, false);

  // Build applicants map: jobId -> Applicant[]
  const applicantsMap: Record<string, any[]> = {};
  for (const job of jobs) {
    const applicants = await CareerRepository.getJobApplicationsForJob(user.tenantId, job.id);
    applicantsMap[job.id] = applicants;
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.userId),
  });

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Placement",
    lastName: dbUser?.lastName || "Officer",
    email: dbUser?.email || user.email,
    role: user.role,
  };

  return (
    <DashboardLayout user={userData} tenant={tenant}>
      <GuestSandboxBanner role={user.role} />
      
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Placement Console</h1>
          <p className="text-xs text-muted-foreground">
            Post job openings, review student applications, manage interview workflows, and release offers.
          </p>
        </div>

        <PlacementConsole jobs={jobs} applicantsMap={applicantsMap} userRole={user.role} />
      </div>
    </DashboardLayout>
  );
}
