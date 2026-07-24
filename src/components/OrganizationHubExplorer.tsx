"use client";

import React, { useState } from "react";
import { Search, ArrowRight, CheckCircle, BookOpen, Users, Layers, SlidersHorizontal, Sparkles } from "lucide-react";
import { getShortTenantName } from "@/utils/tenant-formatter";
import { BrandLogo } from "@/components/BrandLogo";

interface Academy {
  id: string;
  subdomain: string;
  name: string;
  branding?: {
    primaryColor?: string;
    companyName?: string;
  };
}

interface Stats {
  courseCount: number;
  studentCount: number;
  batchCount: number;
}

interface OrganizationHubExplorerProps {
  childAcademies: Academy[];
  statsMap: Record<string, Stats>;
  primaryColor: string;
  host: string;
  portSuffix: string;
  parentSubdomain?: string;
  isLoggedIn?: boolean;
}

export function OrganizationHubExplorer({
  childAcademies,
  statsMap,
  primaryColor,
  host,
  portSuffix,
  parentSubdomain,
  isLoggedIn,
}: OrganizationHubExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "courses" | "students">("name");

  const filteredAcademies = childAcademies.filter((org) => {
    const nameMatch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const subdomainMatch = org.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
    const companyMatch = org.branding?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return nameMatch || subdomainMatch || companyMatch;
  });

  const sortedAcademies = [...filteredAcademies].sort((a, b) => {
    if ((parentSubdomain === "vt" || parentSubdomain === "vti") && sortBy === "name") {
      if (a.subdomain === "intel") return -1;
      if (b.subdomain === "intel") return 1;
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "courses") {
      const aCount = statsMap[a.id]?.courseCount ?? 0;
      const bCount = statsMap[b.id]?.courseCount ?? 0;
      return bCount - aCount; // descending
    }
    if (sortBy === "students") {
      const aCount = statsMap[a.id]?.studentCount ?? 0;
      const bCount = statsMap[b.id]?.studentCount ?? 0;
      return bCount - aCount; // descending
    }
    return 0;
  });

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto">
      {/* Search & Sort Panel */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-card/20 backdrop-blur-md border border-slate-200/60 dark:border-border/40 shadow-lg relative z-20">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-muted-foreground" />
          <input
            type="text"
            placeholder="Search academy or industry partner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 text-sm bg-white/60 dark:bg-background/40 border border-slate-200 dark:border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 dark:text-foreground"
            style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-muted-foreground font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Sort By:
          </span>
          <div className="flex rounded-lg bg-slate-100/80 dark:bg-background/40 p-1 border border-slate-200/60 dark:border-border/40 text-xs font-bold">
            {(["name", "courses", "students"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortBy(mode)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer capitalize ${
                  sortBy === mode
                    ? "bg-white dark:bg-background text-slate-800 dark:text-foreground shadow-sm"
                    : "text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Academy Cards */}
      {sortedAcademies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {sortedAcademies.map((org) => {
            const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
            const isVercel = host.endsWith(".vercel.app");
            
            const parentSub = parentSubdomain || "vt";
            const devUrl = "/dashboard";
            const pColor = org.branding?.primaryColor || primaryColor;
            const stats = statsMap[org.id] || { courseCount: 0, studentCount: 0, batchCount: 0 };

            return (
              <a
                key={org.subdomain}
                href={devUrl}
                className="flex flex-col justify-between p-6 rounded-3xl bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/40 text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl hover:border-[var(--tenant-color)]/30 group relative overflow-hidden"
                style={{
                  "--tenant-color": pColor,
                } as React.CSSProperties}
              >
                {/* Sleek top-indicator bar */}
                <div
                  className="absolute left-0 right-0 top-0 h-1.5 transition-all duration-300"
                  style={{ backgroundColor: pColor }}
                />
                
                {/* Soft ambient corner glow */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-500 pointer-events-none"
                  style={{ backgroundColor: pColor }}
                />

                <div className="space-y-6 relative z-10">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-center">
                      <BrandLogo subdomain={org.subdomain} iconOnly className="h-6 w-auto" />
                    </div>
                    
                    <span
                      className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40"
                    >
                      .{org.subdomain}
                    </span>
                  </div>

                  {/* Card Main Info */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5 group-hover:text-[var(--tenant-color)] transition-colors flex items-center gap-1.5">
                      {getShortTenantName(org.name, org.subdomain)}
                      {stats.studentCount > 10 && (
                        <span className="inline-flex" title="Popular CoE">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {org.branding?.companyName
                        ? `${org.branding.companyName} — Advanced semiconductor training, EDA labs, and industry placement programs.`
                        : "Access physical-layout labs, CAD simulation nodes, and verified job postings from international semiconductor partners."}
                    </p>
                  </div>

                  {/* Card Stats Row (Neutral and Elegant) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800/30 text-slate-600 dark:text-slate-400 transition-all duration-300 group-hover:scale-[1.02]">
                      <BookOpen className="w-3.5 h-3.5" style={{ color: pColor }} />
                      {stats.courseCount} Courses
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800/30 text-slate-600 dark:text-slate-400 transition-all duration-300 group-hover:scale-[1.02]">
                      <Users className="w-3.5 h-3.5" style={{ color: pColor }} />
                      {stats.studentCount} Students
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800/30 text-slate-600 dark:text-slate-400 transition-all duration-300 group-hover:scale-[1.02]">
                      <Layers className="w-3.5 h-3.5" style={{ color: pColor }} />
                      {stats.batchCount} Cohorts
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/40 flex justify-between items-center text-xs font-bold relative z-10">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-500">
                    <CheckCircle className="w-3.5 h-3.5 animate-pulse" /> Active
                  </span>
                  <span
                    className="flex items-center gap-1 transition-all group-hover:gap-2.5"
                    style={{ color: pColor }}
                  >
                    Access Portal{" "}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 p-8 rounded-3xl bg-card/10 border border-dashed border-border/50 max-w-md mx-auto relative z-10">
          <p className="text-sm font-semibold text-muted-foreground">No academies found matching your search.</p>
        </div>
      )}
    </div>
  );
}
