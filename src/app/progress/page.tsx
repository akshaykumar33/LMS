import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { AnalyticsRepository } from "@/features/analytics/repository/analytics-repository";
import { CertificateRepository } from "@/features/course/repository/certificate-repository";
import { db } from "@/db/db";
import { students, users, lessonProgress } from "@/db/schema";
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
  const gamification = await AnalyticsRepository.getStudentGamification(studentProfile.id);

  // Fetch SCORM progress
  const scormRows = await db.query.lessonProgress.findMany({
    where: eq(lessonProgress.studentId, studentProfile.id),
    with: {
      lesson: {
        with: {
          module: {
            with: { course: true }
          }
        }
      }
    }
  });

  const scormTelemetry = scormRows
    .filter((p: any) => p.lesson?.contentType === "scorm")
    .map((p: any) => {
      const data = (p.scormData || {}) as Record<string, string>;
      return {
        lessonTitle: p.lesson?.title || "Unknown",
        courseName: p.lesson?.module?.course?.name || "",
        completed: p.completed,
        score: data["cmi.core.score.raw"] || data["cmi.score.raw"] || null,
        timeSpentSeconds: parseInt(data["_total_time_seconds"] || "0", 10),
        status: data["cmi.core.lesson_status"] || data["cmi.completion_status"] || "not attempted",
      };
    });

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
        gamification={gamification}
        scormTelemetry={scormTelemetry}
        user={userData}
        tenant={tenant}
        studentProfile={studentProfile}
      />
    </DashboardLayout>
  );
}
