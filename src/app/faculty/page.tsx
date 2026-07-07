import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { GuestSandboxBanner } from "@/components/GuestSandboxBanner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FacultyRepository } from "@/features/faculty/repository/faculty-repository";
import { ScheduleClassForm } from "@/features/faculty/components/ScheduleClassForm";
import { FacultyQuickConfigForm } from "@/features/faculty/components/FacultyQuickConfigForm";
import { db } from "@/db/db";
import { courses, users, projectSubmissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FacultyDashboardClient } from "@/features/faculty/components/FacultyDashboardClient";

interface PageProps {
  searchParams: Promise<{ batchId?: string }>;
}

export default async function FacultyPage({ searchParams }: PageProps) {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  const user = await requireAuth(["Owner", "Admin", "Faculty", "Mentor", "Program Manager"]);

  // 1. Fetch batches
  const batchesList = await FacultyRepository.getTenantBatches(tenant.id);
  
  // Resolve selected batch
  const resolvedParams = await searchParams;
  const selectedBatchId = resolvedParams.batchId || batchesList[0]?.id || "";

  // 2. Fetch roster for selected batch
  let roster: any[] = [];
  if (selectedBatchId) {
    roster = await FacultyRepository.getBatchRoster(tenant.id, selectedBatchId);
  }

  // 3. Fetch courses with their modules for the scheduling form
  const coursesWithModules = await db.query.courses.findMany({
    where: eq(courses.tenantId, tenant.id),
    orderBy: [courses.code],
    with: {
      modules: {
        orderBy: (modules: any, { asc }: any) => [asc(modules.order)],
        with: {
          lessons: {
            orderBy: (lessons: any, { asc }: any) => [asc(lessons.order)],
          },
        },
      },
    },
  });

  // 4. Fetch recent quiz attempts
  const recentAttempts = await FacultyRepository.getRecentAttempts(tenant.id);

  // 5. Fetch project submissions
  const projectSubmissionsList = await db.query.projectSubmissions.findMany({
    where: eq(projectSubmissions.tenantId, tenant.id),
    orderBy: (ps: any, { desc }: any) => [desc(ps.submittedAt)],
    with: {
      project: {
        with: {
          course: true,
        },
      },
      student: {
        with: {
          user: true,
        },
      },
    },
  });

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.userId),
  });

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Faculty",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
  };

  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";

  return (
    <DashboardLayout user={userData} tenant={tenant}>
      <GuestSandboxBanner role={user.role} />
      
      {/* Faculty Hero header & overview stats */}
      <div className="space-y-6 mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-foreground">Faculty Control Center</h1>
            <p className="text-xs text-muted-foreground">
              Monitor candidate progression, schedule virtual classrooms, and modify micro-curriculum targets.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[
            { label: "Active Cohorts", value: batchesList.length, desc: "Sectors monitored" },
            { label: "Enrolled Trainees", value: batchesList.reduce((acc: number, b: any) => acc + (b.studentCount || 0), 0), desc: "Engineering trainees" },
            { label: "Recent Quiz Logs", value: recentAttempts.length, desc: "Evaluations recorded" },
            { label: "Active Courses", value: coursesWithModules.length, desc: "Syllabi configured" },
          ].map((stat, i) => (
            <div key={i} className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-2 shadow-sm">
              <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">{stat.label}</span>
              <p className="text-2xl font-black text-foreground">{stat.value}</p>
              <span className="text-[9px] text-muted-foreground block font-semibold">{stat.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <FacultyDashboardClient 
        roster={roster}
        recentAttempts={recentAttempts}
        batchesList={batchesList}
        selectedBatchId={selectedBatchId}
        primaryColor={primaryColor}
        courses={coursesWithModules}
        projectSubmissions={projectSubmissionsList}
        userRole={user.role}
      />
    </DashboardLayout>
  );
}
