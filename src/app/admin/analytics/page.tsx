import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { GuestSandboxBanner } from "@/components/GuestSandboxBanner";
import { AnalyticsRepository } from "@/features/analytics/repository/analytics-repository";
import { ClipboardList, CheckCircle2, Clock, XCircle, Users, BookOpen, BarChart3, Trophy, TrendingUp } from "lucide-react";
import { AnalyticsCharts } from "@/features/analytics/components/AnalyticsCharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { db, dbSubdomainStorage } from "@/db/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminAnalyticsPage() {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  const stats = await AnalyticsRepository.getTenantAnalytics(user.tenantId);

  const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
    await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    })
  );

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Admin",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
    subdomain: user.subdomain,
  };

  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";

  // Prepare chart data
  const funnelData = [
    { name: "Applications", value: stats.applications.totalApplications, fill: primaryColor },
    { name: "Pending", value: stats.applications.pending, fill: "#f59e0b" },
    { name: "Approved", value: stats.applications.approved, fill: "#10b981" },
    { name: "Rejected", value: stats.applications.rejected, fill: "#ef4444" },
  ];

  const performanceData = [
    { name: "Avg Score", value: Number(stats.quizPerformance.avgScore), fill: "#a855f7" },
    { name: "Pass Rate", value: Number(stats.quizPerformance.passRate), fill: "#10b981" },
    { name: "Fail Rate", value: 100 - Number(stats.quizPerformance.passRate), fill: "#ef4444" },
  ];

  return (
    <DashboardLayout user={userData} tenant={tenant}>
      <GuestSandboxBanner role={user.role} />
      
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Platform Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">{tenant.name} — Tenant-wide enrollment, performance, and operational metrics.</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Applications", value: stats.applications.totalApplications, color: "text-primary", icon: ClipboardList, iconBg: "bg-primary/10" },
            { label: "Approved", value: stats.applications.approved, color: "text-emerald-400", icon: CheckCircle2, iconBg: "bg-emerald-500/10" },
            { label: "Pending Review", value: stats.applications.pending, color: "text-amber-400", icon: Clock, iconBg: "bg-amber-500/10" },
            { label: "Rejected", value: stats.applications.rejected, color: "text-destructive", icon: XCircle, iconBg: "bg-destructive/10" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <div className={`p-2 rounded-lg ${s.iconBg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Operational Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">People</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Enrolled Students</span>
                <span className="font-black text-foreground text-lg">{stats.totalStudents}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Staff & Faculty</span>
                <span className="font-black text-foreground text-lg">{stats.totalStaff}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Curriculum</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Active Courses</span>
                <span className="font-black text-foreground text-lg">{stats.totalCourses}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Quiz Attempts</span>
                <span className="font-black text-foreground text-lg">{stats.quizPerformance.totalAttempts}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Avg Quiz Score</span>
                <span className="font-black text-purple-400 text-lg">{stats.quizPerformance.avgScore}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Pass Rate</span>
                <span className="font-black text-emerald-400 text-lg">{stats.quizPerformance.passRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Charts */}
        <AnalyticsCharts 
          funnelData={funnelData}
          performanceData={performanceData}
          primaryColor={primaryColor}
        />

        {/* Admission Funnel Progress Bars */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admission Funnel</h3>
          </div>
          {[
            { label: "Applications Received", value: stats.applications.totalApplications, max: stats.applications.totalApplications, color: primaryColor },
            { label: "Under Review / Pending", value: stats.applications.pending, max: stats.applications.totalApplications, color: "#f59e0b" },
            { label: "Approved & Enrolled", value: stats.applications.approved, max: stats.applications.totalApplications, color: "#10b981" },
            { label: "Rejected", value: stats.applications.rejected, max: stats.applications.totalApplications, color: "#ef4444" },
          ].map(bar => {
            const pct = bar.max > 0 ? Math.round((bar.value / bar.max) * 100) : 0;
            return (
              <div key={bar.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{bar.label}</span>
                  <span className="font-bold text-foreground">{bar.value} ({pct}%)</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: bar.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
