/**
 * @file analytics-store.ts
 * @description Zustand store for the Analytics Console page.
 *
 * Replaces all useState calls in AnalyticsConsole.tsx:
 *   - activeTab, searchTerm, tierFilter, statusFilter, sortBy, sortOrder
 *   - chartMetric, focusedTenant, hoveredKpi
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyticsTab = "overview" | "matrix" | "charts";
export type TierFilter = "all" | "parent" | "child";
export type StatusFilter = "all" | "active" | "suspended";
export type SortField = "name" | "students" | "courses" | "score";
export type SortOrder = "asc" | "desc";
export type ChartMetric = "students" | "courses" | "score";

export interface TenantAnalytics {
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

interface AnalyticsState {
  // ── Navigation ───────────────────────────────────────────────────────────────
  activeTab: AnalyticsTab;

  // ── Matrix filters ───────────────────────────────────────────────────────────
  searchTerm: string;
  tierFilter: TierFilter;
  statusFilter: StatusFilter;
  sortBy: SortField;
  sortOrder: SortOrder;

  // ── Chart ────────────────────────────────────────────────────────────────────
  chartMetric: ChartMetric;

  // ── Drill-down ───────────────────────────────────────────────────────────────
  focusedTenant: TenantAnalytics | null;

  // ── KPI tooltip ──────────────────────────────────────────────────────────────
  hoveredKpi: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────────
  setActiveTab: (tab: AnalyticsTab) => void;
  setSearchTerm: (term: string) => void;
  setTierFilter: (filter: TierFilter) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  /** Toggle sort field; if same field clicked, invert the sort order. */
  handleSort: (field: SortField) => void;
  setChartMetric: (metric: ChartMetric) => void;
  setFocusedTenant: (tenant: TenantAnalytics | null) => void;
  setHoveredKpi: (kpi: string | null) => void;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const initialState = {
  activeTab: "overview" as AnalyticsTab,
  searchTerm: "",
  tierFilter: "all" as TierFilter,
  statusFilter: "all" as StatusFilter,
  sortBy: "name" as SortField,
  sortOrder: "asc" as SortOrder,
  chartMetric: "students" as ChartMetric,
  focusedTenant: null,
  hoveredKpi: null,
};

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setActiveTab: (tab) =>
        set({ activeTab: tab }, false, "analytics/setActiveTab"),

      setSearchTerm: (term) =>
        set({ searchTerm: term }, false, "analytics/setSearchTerm"),

      setTierFilter: (filter) =>
        set({ tierFilter: filter }, false, "analytics/setTierFilter"),

      setStatusFilter: (filter) =>
        set({ statusFilter: filter }, false, "analytics/setStatusFilter"),

      handleSort: (field) =>
        set(
          (s) => ({
            sortBy: field,
            sortOrder:
              s.sortBy === field
                ? s.sortOrder === "asc"
                  ? "desc"
                  : "asc"
                : "desc",
          }),
          false,
          "analytics/handleSort"
        ),

      setChartMetric: (metric) =>
        set({ chartMetric: metric }, false, "analytics/setChartMetric"),

      setFocusedTenant: (tenant) =>
        set({ focusedTenant: tenant }, false, "analytics/setFocusedTenant"),

      setHoveredKpi: (kpi) =>
        set({ hoveredKpi: kpi }, false, "analytics/setHoveredKpi"),

      reset: () => set(initialState, false, "analytics/reset"),
    }),
    { name: "AnalyticsStore" }
  )
);
