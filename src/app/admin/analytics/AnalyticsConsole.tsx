"use client";

import React, { useMemo } from "react";
import { useAnalyticsStore } from "@/store";
import { 
  Download, Building2, Users, Search, ChevronUp, ChevronDown, X, TrendingUp, 
  BookOpen, BarChart3, ChevronRight, Layers, LayoutGrid
} from "lucide-react";

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
  const data = initialData;

  const {
    activeTab, setActiveTab,
    searchTerm, setSearchTerm,
    tierFilter, setTierFilter,
    statusFilter, setStatusFilter,
    sortBy, sortOrder, handleSort,
    chartMetric, setChartMetric,
    focusedTenant, setFocusedTenant,
  } = useAnalyticsStore();

  // Filtered and Sorted tenants
  const processedTenants = useMemo(() => {
    return data.tenants
      .filter((t) => {
        const matchSearch =
          t.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.subdomain.toLowerCase().includes(searchTerm.toLowerCase());

        const matchTier =
          tierFilter === "all" ||
          (tierFilter === "parent" && !t.parentTenantId) ||
          (tierFilter === "child" && t.parentTenantId);

        const matchStatus = statusFilter === "all" || t.status === statusFilter;

        return matchSearch && matchTier && matchStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === "name") {
          comparison = a.tenantName.localeCompare(b.tenantName);
        } else if (sortBy === "students") {
          comparison = a.totalStudents - b.totalStudents;
        } else if (sortBy === "courses") {
          comparison = a.totalCourses - b.totalCourses;
        } else if (sortBy === "score") {
          comparison = a.quizPerformance.avgScore - b.quizPerformance.avgScore;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [data.tenants, searchTerm, tierFilter, statusFilter, sortBy, sortOrder]);

  // Overall average pass rate calculation
  const overallPassRate = useMemo(() => {
    if (!data.tenants.length) return 0;
    const totalPasses = data.tenants.reduce((acc, t) => acc + (t.quizPerformance.passRate || 0), 0);
    return Math.round(totalPasses / data.tenants.length);
  }, [data.tenants]);

  const exportToCSV = () => {
    const headers = [
      "Organization Name",
      "Subdomain",
      "Tier",
      "Status",
      "Total Students",
      "Total Staff",
      "Total Courses",
      "Avg Quiz Score (%)",
      "Quiz Pass Rate (%)",
      "Total Quiz Attempts"
    ];

    const rows = processedTenants.map((t) => [
      t.tenantName,
      t.subdomain,
      t.parentTenantId ? "Child Organization" : "Parent Organization",
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
    link.setAttribute("download", `platform_analytics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-foreground relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 border border-border/60 p-5 rounded-2xl backdrop-blur-md">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5 text-primary" style={{ color: primaryColor }} /> 
            Platform Analytics
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time performance metrics and cohort analytics across your organization.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="h-9 px-4 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer shrink-0 shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <Download className="w-3.5 h-3.5" /> Export CSV Data
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Students */}
        <div className="bg-card/50 border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0" style={{ color: primaryColor }}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider block">Total Students</span>
              <span className="text-xl font-black text-foreground">{data.overall.totalStudents}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Staff */}
        <div className="bg-card/50 border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider block">Total Staff</span>
              <span className="text-xl font-black text-foreground">{data.overall.totalStaff}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Courses */}
        <div className="bg-card/50 border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider block">Total Courses</span>
              <span className="text-xl font-black text-foreground">{data.overall.totalCourses}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Avg Score */}
        <div className="bg-card/50 border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider block">Avg Quiz Score</span>
              <span className="text-xl font-black text-foreground">{data.overall.avgQuizScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher Navigation */}
      <div className="flex border-b border-border/60 gap-6 overflow-x-auto scrollbar-none shrink-0 pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-1 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "overview" 
              ? "border-primary text-primary font-black" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          style={activeTab === "overview" ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Overview & Standings
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-1 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "matrix" 
              ? "border-primary text-primary font-black" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          style={activeTab === "matrix" ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
        >
          <Layers className="w-3.5 h-3.5" /> Organization Grid ({processedTenants.length})
        </button>
        <button
          onClick={() => setActiveTab("charts")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-1 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "charts" 
              ? "border-primary text-primary font-black" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          style={activeTab === "charts" ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Comparative Analytics
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Key Metrics Distribution */}
          <div className="bg-card/40 border border-border/80 p-5 rounded-2xl lg:col-span-2 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Cohort Standings
              </h3>
              <span className="text-[10px] text-muted-foreground font-semibold">
                Ranked by student scale
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {data.tenants.length > 0 ? (
                [...data.tenants]
                  .sort((a, b) => b.totalStudents - a.totalStudents)
                  .slice(0, 5)
                  .map((t) => {
                    const maxStudents = Math.max(...data.tenants.map((x) => x.totalStudents), 1);
                    const pct = (t.totalStudents / maxStudents) * 100;
                    return (
                      <div 
                        key={t.tenantId} 
                        onClick={() => setFocusedTenant(t)}
                        className="space-y-1.5 p-2.5 rounded-xl hover:bg-muted/20 transition-all cursor-pointer group border border-transparent hover:border-border/60"
                      >
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-foreground font-bold group-hover:text-primary transition-colors">
                            {t.tenantName} <span className="text-[10px] text-muted-foreground font-mono font-medium">(.{t.subdomain})</span>
                          </span>
                          <span className="text-muted-foreground font-mono font-extrabold">{t.totalStudents} Students</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(pct, 4)}%`,
                              backgroundColor: t.parentTenantId ? "#10b981" : primaryColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs font-semibold">
                  No tenant data available.
                </div>
              )}
            </div>
          </div>

          {/* Academic Standing Summary Card */}
          <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/60 pb-3">
                Global Quiz Performance
              </h3>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">Calculated across all courses and active cohorts.</p>
            </div>
            
            <div className="py-4 flex flex-col items-center justify-center space-y-3">
              <div className="text-center space-y-1">
                <span className="text-4xl font-black text-foreground">{data.overall.avgQuizScore}%</span>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Average Score</span>
              </div>
              <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden max-w-[200px]">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500" 
                  style={{ width: `${data.overall.avgQuizScore}%`, backgroundColor: primaryColor }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground font-semibold">
                <span>Total Quiz Attempts</span>
                <span className="font-extrabold text-foreground font-mono">{data.overall.totalQuizAttempts}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground font-semibold">
                <span>Average Pass Rate</span>
                <span className="font-extrabold text-emerald-500 font-mono">{overallPassRate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIX (THE HIERARCHY GRID) */}
      {activeTab === "matrix" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filters console */}
          <div className="p-3.5 bg-card/40 border border-border/80 rounded-2xl flex flex-col md:flex-row items-center gap-3 shadow-sm">
            <div className="relative w-full md:flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by organization name or subdomain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-4 bg-transparent border border-border/60 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/45 text-foreground placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <select
                value={tierFilter}
                onChange={(e: any) => setTierFilter(e.target.value)}
                className="h-9 px-3 bg-card border border-border/60 rounded-xl text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Tiers</option>
                <option value="parent">Parent Organizations</option>
                <option value="child">Child Organizations</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="h-9 px-3 bg-card border border-border/60 rounded-xl text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Matrix table */}
          <div className="bg-card/40 border border-border/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/60 text-[9px] uppercase font-black text-muted-foreground tracking-wider select-none">
                    <th className="px-5 py-3 cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                      Organization {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
                    </th>
                    <th className="px-5 py-3">Subdomain</th>
                    <th className="px-5 py-3">Tier</th>
                    <th className="px-5 py-3 cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("students")}>
                      Students {sortBy === "students" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
                    </th>
                    <th className="px-5 py-3 cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("courses")}>
                      Courses {sortBy === "courses" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
                    </th>
                    <th className="px-5 py-3 cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("score")}>
                      Avg Score {sortBy === "score" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)}
                    </th>
                    <th className="px-5 py-3 text-center">Pass Rate</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {processedTenants.length > 0 ? (
                    processedTenants.map((t) => (
                      <tr 
                        key={t.tenantId} 
                        onClick={() => setFocusedTenant(t)}
                        className={`hover:bg-muted/20 transition-all cursor-pointer group ${
                          focusedTenant?.tenantId === t.tenantId ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5 font-bold text-foreground">
                          {t.tenantName}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-muted-foreground font-medium text-[11px]">
                          .{t.subdomain}
                        </td>
                        <td className="px-5 py-3.5">
                          {t.parentTenantId ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Child
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20" style={{ color: primaryColor }}>
                              Parent
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-extrabold text-foreground text-center">{t.totalStudents}</td>
                        <td className="px-5 py-3.5 font-mono font-extrabold text-foreground text-center">{t.totalCourses}</td>
                        <td className="px-5 py-3.5 font-mono font-extrabold text-primary text-center" style={{ color: primaryColor }}>{t.quizPerformance.avgScore}%</td>
                        <td className="px-5 py-3.5 font-mono font-extrabold text-emerald-500 text-center">{t.quizPerformance.passRate}%</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFocusedTenant(t);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary/60 hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold transition-all border border-border/60 cursor-pointer"
                          >
                            Details <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground font-semibold">
                        No organization nodes matching filter parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPARATIVE CHARTS */}
      {activeTab === "charts" && (
        <div className="bg-card/40 border border-border/80 p-5 rounded-2xl space-y-5 animate-in fade-in duration-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Comparative Distribution
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Compare performance metrics across organizations.</p>
            </div>

            {/* Metric select toggles */}
            <div className="flex bg-muted/30 border border-border/60 p-1 rounded-xl gap-1">
              <button
                onClick={() => setChartMetric("students")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                  chartMetric === "students" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={chartMetric === "students" ? { backgroundColor: primaryColor } : undefined}
              >
                By Students
              </button>
              <button
                onClick={() => setChartMetric("courses")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                  chartMetric === "courses" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={chartMetric === "courses" ? { backgroundColor: primaryColor } : undefined}
              >
                By Courses
              </button>
              <button
                onClick={() => setChartMetric("score")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                  chartMetric === "score" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={chartMetric === "score" ? { backgroundColor: primaryColor } : undefined}
              >
                By Avg Score
              </button>
            </div>
          </div>

          {/* Dynamic Comparative Chart visualizer */}
          <div className="space-y-3 pt-1">
            {data.tenants.length > 0 ? (
              [...data.tenants]
                .sort((a, b) => {
                  if (chartMetric === "students") return b.totalStudents - a.totalStudents;
                  if (chartMetric === "courses") return b.totalCourses - a.totalCourses;
                  return b.quizPerformance.avgScore - a.quizPerformance.avgScore;
                })
                .map((t) => {
                  let val = 0;
                  let maxVal = 1;
                  let suffix = "";
                  
                  if (chartMetric === "students") {
                    val = t.totalStudents;
                    maxVal = Math.max(...data.tenants.map(x => x.totalStudents), 1);
                    suffix = " Students";
                  } else if (chartMetric === "courses") {
                    val = t.totalCourses;
                    maxVal = Math.max(...data.tenants.map(x => x.totalCourses), 1);
                    suffix = " Courses";
                  } else {
                    val = t.quizPerformance.avgScore;
                    maxVal = 100;
                    suffix = "% Avg Score";
                  }

                  const pct = Math.round((val / maxVal) * 100);

                  return (
                    <div 
                      key={t.tenantId} 
                      onClick={() => setFocusedTenant(t)}
                      className="space-y-1.5 p-2.5 rounded-xl hover:bg-muted/20 transition-all cursor-pointer group border border-transparent hover:border-border/60"
                    >
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-foreground font-bold group-hover:text-primary transition-colors">
                          {t.tenantName}
                        </span>
                        <span className="font-mono text-muted-foreground font-extrabold">{val}{suffix}</span>
                      </div>
                      <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, 3)}%`,
                            backgroundColor: chartMetric === "score" 
                              ? (val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#ef4444")
                              : (t.parentTenantId ? "#10b981" : primaryColor),
                          }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No telemetry data available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Slide-out Drawer Panel */}
      {focusedTenant && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-end p-0">
          <div className="absolute inset-0" onClick={() => setFocusedTenant(null)} />
          
          <div className="relative w-full max-w-md h-full bg-card border-l border-border p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary" style={{ color: primaryColor }}>
                    Organization Focus
                  </span>
                  <h3 className="text-lg font-black text-foreground">{focusedTenant.tenantName}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono font-bold">Subdomain: .{focusedTenant.subdomain}</p>
                </div>
                <button
                  onClick={() => setFocusedTenant(null)}
                  className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Admissions Application Funnel */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Admissions Funnel</h4>
                
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <span className="text-[9px] text-emerald-500 font-extrabold uppercase block mb-0.5">Approved</span>
                    <span className="text-base font-black text-emerald-500">{focusedTenant.applications.approved}</span>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                    <span className="text-[9px] text-amber-500 font-extrabold uppercase block mb-0.5">Pending</span>
                    <span className="text-base font-black text-amber-500">{focusedTenant.applications.pending}</span>
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                    <span className="text-[9px] text-rose-500 font-extrabold uppercase block mb-0.5">Rejected</span>
                    <span className="text-base font-black text-rose-500">{focusedTenant.applications.rejected}</span>
                  </div>
                </div>

                {focusedTenant.applications.totalApplications > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground font-extrabold pt-1">
                    <span>Approval Rate: {Math.round((focusedTenant.applications.approved / focusedTenant.applications.totalApplications) * 100)}%</span>
                    <span>Total Applications: {focusedTenant.applications.totalApplications}</span>
                  </div>
                )}
              </div>

              {/* Resource Allocations */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Resources & Scale</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-muted/20 rounded-xl border border-border/40">
                    <span className="text-muted-foreground font-semibold">Faculty & Staff Members</span>
                    <span className="font-extrabold text-foreground font-mono">{focusedTenant.totalStaff}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/20 rounded-xl border border-border/40">
                    <span className="text-muted-foreground font-semibold">Published Courses</span>
                    <span className="font-extrabold text-foreground font-mono">{focusedTenant.totalCourses}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/20 rounded-xl border border-border/40">
                    <span className="text-muted-foreground font-semibold">Student-Staff Ratio</span>
                    <span className="font-extrabold text-foreground font-mono">
                      {focusedTenant.totalStaff > 0 ? `${Math.round(focusedTenant.totalStudents / focusedTenant.totalStaff)}:1` : `${focusedTenant.totalStudents}:0`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Performance */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Academic Performance</h4>
                <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Quiz Attempts</span>
                    <span className="font-extrabold text-foreground font-mono">{focusedTenant.quizPerformance.totalAttempts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Pass Rate</span>
                    <span className="font-extrabold text-emerald-500 font-mono">{focusedTenant.quizPerformance.passRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Average Grade Score</span>
                    <span className="font-extrabold text-primary font-mono" style={{ color: primaryColor }}>{focusedTenant.quizPerformance.avgScore}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60">
              <button
                onClick={() => setFocusedTenant(null)}
                className="w-full py-2.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold text-foreground cursor-pointer transition-colors"
              >
                Close Focus Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
