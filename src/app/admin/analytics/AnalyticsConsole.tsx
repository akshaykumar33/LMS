"use client";

import React, { useState } from "react";
import { Download, Building2, Users, GraduationCap, BarChart2, Shield } from "lucide-react";

interface TenantAnalytics {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  parentTenantId: string | null;
  status: string;
  applications: {
    totalApplications: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  totalStudents: number;
  totalStaff: number;
  totalCourses: number;
  quizPerformance: {
    totalAttempts: number;
    avgScore: number;
    passRate: number;
  };
}

interface AnalyticsConsoleProps {
  initialData: {
    overall: {
      totalStudents: number;
      totalStaff: number;
      totalCourses: number;
      avgQuizScore: number;
      totalQuizAttempts: number;
    };
    tenants: TenantAnalytics[];
  };
  userRole: string;
  primaryColor?: string;
}

export default function AnalyticsConsole({ initialData, userRole, primaryColor = "#0ea5e9" }: AnalyticsConsoleProps) {
  const [data, setData] = useState(initialData);

  const exportToCSV = () => {
    const headers = [
      "Organization Name",
      "Subdomain",
      "Hierarchy Tier",
      "Status",
      "Total Students",
      "Total Staff",
      "Total Courses",
      "Avg Quiz Score",
      "Quiz Pass Rate (%)",
      "Total Quiz Attempts"
    ];

    const rows = data.tenants.map((t) => [
      t.tenantName,
      t.subdomain,
      t.parentTenantId ? "Child Sub-tenant" : "Parent / Primary Tenant",
      t.status,
      t.totalStudents,
      t.totalStaff,
      t.totalCourses,
      t.quizPerformance.avgScore,
      t.quizPerformance.passRate,
      t.quizPerformance.totalAttempts
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wysbryx_lms_analytics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 p-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Organization Analytics Console</h1>
          <p className="text-xs text-muted-foreground">
            {userRole === "SuperAdmin"
              ? "Global overview across all schemas and micro-organizations."
              : "Cross-tenant performance aggregates for parent and child cohorts."}
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="h-10 px-4 bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export CSV Data
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card/40 border border-border/80 backdrop-blur-xl p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Total Students</span>
            <span className="text-2xl font-black">{data.overall.totalStudents}</span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/80 backdrop-blur-xl p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Total Staff</span>
            <span className="text-2xl font-black">{data.overall.totalStaff}</span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/80 backdrop-blur-xl p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Total Courses</span>
            <span className="text-2xl font-black">{data.overall.totalCourses}</span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/80 backdrop-blur-xl p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Avg Quiz Score</span>
            <span className="text-2xl font-black">{data.overall.avgQuizScore}%</span>
          </div>
        </div>
      </div>

      {/* Graphical Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Completion Distribution */}
        <div className="bg-card/30 border border-border p-6 rounded-2xl lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Cohort Distribution by Student Count</h3>
          <div className="space-y-3.5 pt-2">
            {data.tenants.map((t) => {
              const maxStudents = Math.max(...data.tenants.map((x) => x.totalStudents), 1);
              const pct = (t.totalStudents / maxStudents) * 100;
              return (
                <div key={t.tenantId} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-foreground/90 font-bold">{t.tenantName} ({t.subdomain})</span>
                    <span className="text-muted-foreground">{t.totalStudents} Students</span>
                  </div>
                  <div className="h-3 w-full bg-neutral-900 border border-border/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: t.parentTenantId ? "#10b981" : primaryColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Academic Performance Distribution */}
        <div className="bg-card/30 border border-border p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Performance Overview</h3>
            <p className="text-[10px] text-muted-foreground">Aggregated across {data.overall.totalQuizAttempts} total quiz submissions.</p>
          </div>
          
          <div className="py-6 flex flex-col items-center justify-center relative">
            {/* Visual Gauge */}
            <div className="relative w-36 h-36 border-8 border-neutral-900 rounded-full flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-full border-8 border-t-sky-400 border-r-sky-500 border-b-sky-500/40 border-l-transparent animate-spin" 
                style={{ animationDuration: '6s' }}
              />
              <div className="text-center">
                <span className="text-3xl font-black text-sky-400">{data.overall.avgQuizScore}%</span>
                <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-widest mt-1">Passing Mark</span>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-muted-foreground leading-relaxed">
            Overall quiz score average meets system target grade parameters.
          </div>
        </div>
      </div>

      {/* Tenancy Hierarchy Summary Table */}
      <div className="bg-card/30 border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Hierarchy Matrix Overview</h3>
          <span className="px-2 py-0.5 bg-neutral-950 border border-border text-[9px] font-bold text-neutral-400 rounded-md">
            {data.tenants.length} Tenant Nodes Connected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Subdomain</th>
                <th className="px-6 py-3.5">Tier</th>
                <th className="px-6 py-3.5">Students</th>
                <th className="px-6 py-3.5">Courses</th>
                <th className="px-6 py-3.5">Avg Quiz Score</th>
                <th className="px-6 py-3.5">Pass Rate</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.tenants.map((t) => (
                <tr key={t.tenantId} className="hover:bg-secondary/20 transition-all">
                  <td className="px-6 py-4 font-bold text-foreground">
                    {t.tenantName}
                  </td>
                  <td className="px-6 py-4 font-mono text-muted-foreground">
                    {t.subdomain}
                  </td>
                  <td className="px-6 py-4">
                    {t.parentTenantId ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Child
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Parent Primary
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-foreground/90">{t.totalStudents}</td>
                  <td className="px-6 py-4 font-mono font-bold text-foreground/90">{t.totalCourses}</td>
                  <td className="px-6 py-4 font-mono font-bold text-sky-400">{t.quizPerformance.avgScore}%</td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-400">{t.quizPerformance.passRate}%</td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                        t.status === "active"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
