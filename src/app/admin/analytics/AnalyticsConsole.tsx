"use client";

import React, { useState, useMemo } from "react";
import { 
  Download, Building2, Users, GraduationCap, BarChart2, Shield, Search, 
  SlidersHorizontal, ChevronUp, ChevronDown, X, Info, TrendingUp, CheckCircle, 
  Clock, AlertTriangle, Layers, BookOpen, BarChart3, HelpCircle, Award, Briefcase, ChevronRight
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
  const [data] = useState(initialData);

  // Tabs for main section
  const [activeTab, setActiveTab] = useState<"overview" | "matrix" | "charts">("overview");

  // Filter and Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "parent" | "child">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [sortBy, setSortBy] = useState<"name" | "students" | "courses" | "score">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Comparative Chart metric selection
  const [chartMetric, setChartMetric] = useState<"students" | "courses" | "score">("students");

  // Focus Drawer state
  const [focusedTenant, setFocusedTenant] = useState<TenantAnalytics | null>(null);

  // Info Tooltip state
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);

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

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

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

    const rows = processedTenants.map((t) => [
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
    <div className="space-y-8 p-6 text-foreground relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary animate-pulse" style={{ color: primaryColor }} /> 
            Organization Analytics Console
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {userRole === "SuperAdmin"
              ? "Global overview across all schemas and micro-organizations."
              : "Cross-tenant performance aggregates for parent and child cohorts."}
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="h-10 px-4 bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" /> Export CSV Data
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Students */}
        <div 
          className="bg-card/45 border border-border/80 backdrop-blur-xl p-5 rounded-2xl flex items-center justify-between relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-sky-500/40 cursor-help"
          onMouseEnter={() => setHoveredKpi("students")}
          onMouseLeave={() => setHoveredKpi(null)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Total Students</span>
              <span className="text-2xl font-black">{data.overall.totalStudents}</span>
            </div>
          </div>
          {hoveredKpi === "students" && (
            <div className="absolute inset-0 bg-popover/95 border border-border p-3 flex items-center justify-center text-center animate-in fade-in duration-200">
              <p className="text-[10px] text-foreground font-semibold leading-relaxed">
                Active student accounts registered across all scope portals.
              </p>
            </div>
          )}
        </div>

        {/* KPI 2: Staff */}
        <div 
          className="bg-card/45 border border-border/80 backdrop-blur-xl p-5 rounded-2xl flex items-center justify-between relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-emerald-500/40 cursor-help"
          onMouseEnter={() => setHoveredKpi("staff")}
          onMouseLeave={() => setHoveredKpi(null)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Total Staff</span>
              <span className="text-2xl font-black">{data.overall.totalStaff}</span>
            </div>
          </div>
          {hoveredKpi === "staff" && (
            <div className="absolute inset-0 bg-popover/95 border border-border p-3 flex items-center justify-center text-center animate-in fade-in duration-200">
              <p className="text-[10px] text-foreground font-semibold leading-relaxed">
                Total staff members (Owners, Admins, Faculty, Mentors) in system.
              </p>
            </div>
          )}
        </div>

        {/* KPI 3: Courses */}
        <div 
          className="bg-card/45 border border-border/80 backdrop-blur-xl p-5 rounded-2xl flex items-center justify-between relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-purple-500/40 cursor-help"
          onMouseEnter={() => setHoveredKpi("courses")}
          onMouseLeave={() => setHoveredKpi(null)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Total Courses</span>
              <span className="text-2xl font-black">{data.overall.totalCourses}</span>
            </div>
          </div>
          {hoveredKpi === "courses" && (
            <div className="absolute inset-0 bg-popover/95 border border-border p-3 flex items-center justify-center text-center animate-in fade-in duration-200">
              <p className="text-[10px] text-foreground font-semibold leading-relaxed">
                Distinct curriculum courses published inside scoped academies.
              </p>
            </div>
          )}
        </div>

        {/* KPI 4: Score */}
        <div 
          className="bg-card/45 border border-border/80 backdrop-blur-xl p-5 rounded-2xl flex items-center justify-between relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-rose-500/40 cursor-help"
          onMouseEnter={() => setHoveredKpi("score")}
          onMouseLeave={() => setHoveredKpi(null)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Avg Quiz Score</span>
              <span className="text-2xl font-black">{data.overall.avgQuizScore}%</span>
            </div>
          </div>
          {hoveredKpi === "score" && (
            <div className="absolute inset-0 bg-popover/95 border border-border p-3 flex items-center justify-center text-center animate-in fade-in duration-200">
              <p className="text-[10px] text-foreground font-semibold leading-relaxed">
                Mean grade aggregate calculated across {data.overall.totalQuizAttempts} total attempts.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Switcher Navigation */}
      <div className="flex border-b border-border/40 gap-4 overflow-x-auto scrollbar-none shrink-0 pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 px-2 shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "overview" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          style={activeTab === "overview" ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
        >
          <Info className="w-3.5 h-3.5" /> Performance Dashboard
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 px-2 shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "matrix" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          style={activeTab === "matrix" ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
        >
          <Layers className="w-3.5 h-3.5" /> Hierarchy Grid ({processedTenants.length})
        </button>
        <button
          onClick={() => setActiveTab("charts")}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 px-2 shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "charts" 
              ? "border-primary text-primary" 
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
          <div className="bg-card/30 border border-border p-6 rounded-2xl lg:col-span-2 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Dynamic Cohort Standings
              </h3>
              <span className="text-[10px] text-muted-foreground italic font-semibold">
                Top 5 organizations ranked by scale
              </span>
            </div>

            <div className="space-y-4 pt-2">
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
                        className="space-y-1.5 p-2 rounded-xl hover:bg-secondary/15 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-foreground/90 font-bold group-hover:text-primary transition-colors" style={{ '--hover-color': primaryColor } as React.CSSProperties}>
                            {t.tenantName} <span className="text-[10px] text-muted-foreground font-normal">({t.subdomain})</span>
                          </span>
                          <span className="text-muted-foreground font-black">{t.totalStudents} Students</span>
                        </div>
                        <div className="h-3 w-full bg-neutral-900 border border-border/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: t.parentTenantId ? "#10b981" : primaryColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-10 text-muted-foreground text-xs font-semibold">
                  No tenant data available.
                </div>
              )}
            </div>
          </div>

          {/* Academic standing Dial Gauge */}
          <div className="bg-card/30 border border-border p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Global Quiz Competency</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Calculated across system-wide courses.</p>
            </div>
            
            <div className="py-6 flex flex-col items-center justify-center relative">
              <div className="relative w-36 h-36 border-8 border-neutral-900 rounded-full flex items-center justify-center shadow-inner">
                <div 
                  className="absolute inset-0 rounded-full border-8 border-t-sky-400 border-r-sky-500 border-b-sky-500/20 border-l-transparent animate-spin" 
                  style={{ animationDuration: '10s' }}
                />
                <div className="text-center z-10">
                  <span className="text-3xl font-black text-sky-400">{data.overall.avgQuizScore}%</span>
                  <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-widest mt-1">Passing Mark</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-muted-foreground font-semibold leading-relaxed pt-2 border-t border-border/40">
              Exam pass mark average is in target zone.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIX (THE HIERARCHY GRID) */}
      {activeTab === "matrix" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filters console */}
          <div className="p-4 bg-card/20 border border-border/80 rounded-2xl flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by organization name or subdomain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-secondary/35 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap">
              <select
                value={tierFilter}
                onChange={(e: any) => setTierFilter(e.target.value)}
                className="h-10 px-3 bg-secondary/35 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Tiers</option>
                <option value="parent">Parent nodes only</option>
                <option value="child">Child nodes only</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="h-10 px-3 bg-secondary/35 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Matrix table */}
          <div className="bg-card/30 border border-border rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-[10px] uppercase font-black text-muted-foreground tracking-widest select-none">
                    <th className="px-6 py-3.5 cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                      Organization {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />)}
                    </th>
                    <th className="px-6 py-3.5">Subdomain</th>
                    <th className="px-6 py-3.5">Tier</th>
                    <th className="px-6 py-3.5 cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("students")}>
                      Students {sortBy === "students" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />)}
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("courses")}>
                      Courses {sortBy === "courses" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />)}
                    </th>
                    <th className="px-6 py-3.5 cursor-pointer hover:text-foreground text-center" onClick={() => handleSort("score")}>
                      Avg Quiz Score {sortBy === "score" && (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />)}
                    </th>
                    <th className="px-6 py-3.5 text-center">Pass Rate</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {processedTenants.length > 0 ? (
                    processedTenants.map((t) => (
                      <tr 
                        key={t.tenantId} 
                        onClick={() => setFocusedTenant(t)}
                        className={`hover:bg-secondary/30 transition-all cursor-pointer group ${
                          focusedTenant?.tenantId === t.tenantId ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-extrabold text-foreground">
                          {t.tenantName}
                        </td>
                        <td className="px-6 py-4 font-mono text-muted-foreground font-semibold">
                          {t.subdomain}
                        </td>
                        <td className="px-6 py-4">
                          {t.parentTenantId ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-450">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Child
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-sky-455">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Parent
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-foreground/90 text-center">{t.totalStudents}</td>
                        <td className="px-6 py-4 font-mono font-black text-foreground/90 text-center">{t.totalCourses}</td>
                        <td className="px-6 py-4 font-mono font-black text-sky-400 text-center">{t.quizPerformance.avgScore}%</td>
                        <td className="px-6 py-4 font-mono font-black text-emerald-400 text-center">{t.quizPerformance.passRate}%</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFocusedTenant(t);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/80 hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold transition-all border border-border"
                          >
                            Drilldown <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground font-semibold">
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
        <div className="bg-card/30 border border-border p-6 rounded-2xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Comparative Metric Distribution
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Select a telemetry vector to dynamically compare organization nodes.</p>
            </div>

            {/* Metric select toggles */}
            <div className="flex bg-secondary/40 border border-border p-1 rounded-xl gap-1">
              <button
                onClick={() => setChartMetric("students")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
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
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
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
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
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
          <div className="space-y-6 pt-2">
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
                    suffix = "% Average Score";
                  }

                  const pct = Math.round((val / maxVal) * 100);

                  return (
                    <div 
                      key={t.tenantId} 
                      onClick={() => setFocusedTenant(t)}
                      className="space-y-2 p-3 bg-secondary/10 border border-border/30 rounded-xl hover:bg-secondary/25 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-foreground/95 font-bold group-hover:text-primary transition-colors" style={{ '--hover-color': primaryColor } as React.CSSProperties}>
                          {t.tenantName}
                        </span>
                        <span className="font-mono text-muted-foreground font-black">{val}{suffix}</span>
                      </div>
                      <div className="h-4 w-full bg-neutral-950 border border-border/40 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full transition-all duration-550 flex items-center justify-end pr-2 text-[8px] font-black text-white"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: chartMetric === "score" 
                              ? (val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#ef4444")
                              : (t.parentTenantId ? "#8b5cf6" : primaryColor),
                          }}
                        >
                          {pct > 15 && `${pct}%`}
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-10 text-muted-foreground text-xs">
                No telemetry data available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drilldown Slide-out Drawer Panel */}
      {focusedTenant && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-end p-0">
          <div className="absolute inset-0" onClick={() => setFocusedTenant(null)} />
          
          <div className="relative w-full max-w-md h-full bg-popover border-l border-border p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-250 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary" style={{ color: primaryColor }}>
                    Academy Focus Metrics
                  </span>
                  <h3 className="text-lg font-black text-foreground">{focusedTenant.tenantName}</h3>
                  <p className="text-[11px] text-muted-foreground font-mono font-bold">Subdomain: {focusedTenant.subdomain}.wysbryx.com</p>
                </div>
                <button
                  onClick={() => setFocusedTenant(null)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Admissions Application Funnel */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Student Admissions Funnel</h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                    <span className="text-[10px] text-emerald-500 font-extrabold uppercase block mb-1">Approved</span>
                    <span className="text-base font-black text-emerald-450">{focusedTenant.applications.approved}</span>
                  </div>
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                    <span className="text-[10px] text-amber-500 font-extrabold uppercase block mb-1">Pending</span>
                    <span className="text-base font-black text-amber-500">{focusedTenant.applications.pending}</span>
                  </div>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-center">
                    <span className="text-[10px] text-rose-500 font-extrabold uppercase block mb-1">Rejected</span>
                    <span className="text-base font-black text-rose-450">{focusedTenant.applications.rejected}</span>
                  </div>
                </div>

                {focusedTenant.applications.totalApplications > 0 ? (
                  <div className="space-y-2">
                    <div className="h-3.5 w-full bg-secondary/50 rounded-full overflow-hidden flex border border-border/40">
                      <div 
                        className="bg-emerald-500 h-full transition-all" 
                        style={{ width: `${(focusedTenant.applications.approved / focusedTenant.applications.totalApplications) * 100}%` }}
                        title="Approved"
                      />
                      <div 
                        className="bg-amber-500 h-full transition-all" 
                        style={{ width: `${(focusedTenant.applications.pending / focusedTenant.applications.totalApplications) * 100}%` }}
                        title="Pending"
                      />
                      <div 
                        className="bg-rose-500 h-full transition-all" 
                        style={{ width: `${(focusedTenant.applications.rejected / focusedTenant.applications.totalApplications) * 100}%` }}
                        title="Rejected"
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground font-black px-1">
                      <span>APPROVAL RATE: {Math.round((focusedTenant.applications.approved / focusedTenant.applications.totalApplications) * 100)}%</span>
                      <span>TOTAL: {focusedTenant.applications.totalApplications}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground italic text-xs border border-dashed border-border rounded-xl">
                    No application metrics recorded.
                  </div>
                )}
              </div>

              {/* Resource Allocations */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Resource Allocations</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-secondary/30 rounded-xl border border-border/40">
                    <span className="text-muted-foreground font-semibold">Faculty / Staff Members</span>
                    <span className="font-extrabold text-foreground">{focusedTenant.totalStaff}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-secondary/30 rounded-xl border border-border/40">
                    <span className="text-muted-foreground font-semibold">Curriculum Courses</span>
                    <span className="font-extrabold text-foreground">{focusedTenant.totalCourses}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-secondary/30 rounded-xl border border-border/40">
                    <span className="text-muted-foreground font-semibold">Student-Faculty Ratio</span>
                    <span className="font-extrabold text-foreground">
                      {focusedTenant.totalStaff > 0 ? `${Math.round(focusedTenant.totalStudents / focusedTenant.totalStaff)}:1` : `${focusedTenant.totalStudents}:0`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Standings */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Academic standing</h4>
                <div className="p-4 bg-muted/15 border border-border/60 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">Total Exam Attempts</span>
                    <span className="font-extrabold text-foreground">{focusedTenant.quizPerformance.totalAttempts}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">Passing Rate</span>
                    <span className="font-black text-emerald-450">{focusedTenant.quizPerformance.passRate}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">Average Grade Score</span>
                    <span className="font-black text-primary" style={{ color: primaryColor }}>{focusedTenant.quizPerformance.avgScore}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
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
