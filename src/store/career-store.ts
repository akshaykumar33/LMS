/**
 * @file career-store.ts
 * @description Zustand store for the Student Career Portal page.
 *
 * Replaces all useState calls in StudentCareerPortal.tsx:
 *   - activeView, selectedJob, submitting, message
 *   - searchQuery, opportunityType, resumeUrl
 *   - applications list (optimistic update after successful apply)
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CareerView = "jobs" | "kanban";
export type OpportunityType = "all" | "job" | "internship";

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary: string | null;
  location: string;
  type: string;
  createdAt: Date | string;
}

export interface StudentApplication {
  id: string;
  jobId: string;
  status: string;
  resumeUrl: string;
  createdAt: Date | string;
  job: { title: string; company: string };
}

export interface CareerMessage {
  type: "success" | "error";
  text: string;
}

interface CareerState {
  // ── Navigation ───────────────────────────────────────────────────────────────
  activeView: CareerView;
  selectedJob: JobPosting | null;

  // ── Filters ──────────────────────────────────────────────────────────────────
  searchQuery: string;
  opportunityType: OpportunityType;

  // ── Application form ─────────────────────────────────────────────────────────
  resumeUrl: string;
  submitting: boolean;
  message: CareerMessage | null;

  // ── Applications list (client-side optimistic cache) ─────────────────────────
  applications: StudentApplication[];

  // ── Actions: Navigation ──────────────────────────────────────────────────────
  setActiveView: (view: CareerView) => void;
  selectJob: (job: JobPosting | null) => void;

  // ── Actions: Filters ─────────────────────────────────────────────────────────
  setSearchQuery: (query: string) => void;
  setOpportunityType: (type: OpportunityType) => void;

  // ── Actions: Form ────────────────────────────────────────────────────────────
  setResumeUrl: (url: string) => void;
  setSubmitting: (submitting: boolean) => void;
  setMessage: (message: CareerMessage | null) => void;

  // ── Actions: Applications ────────────────────────────────────────────────────
  setApplications: (apps: StudentApplication[]) => void;
  addApplication: (app: StudentApplication) => void;

  // ── Actions: Reset form after apply ─────────────────────────────────────────
  resetApplyForm: () => void;

  // ── Derived ──────────────────────────────────────────────────────────────────
  appliedJobIds: () => Set<string>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCareerStore = create<CareerState>()(
  devtools(
    (set, get) => ({
      activeView: "jobs",
      selectedJob: null,
      searchQuery: "",
      opportunityType: "all",
      resumeUrl: "",
      submitting: false,
      message: null,
      applications: [],

      // ── Navigation ───────────────────────────────────────────────────────────
      setActiveView: (view) =>
        set({ activeView: view }, false, "career/setActiveView"),

      selectJob: (job) =>
        set(
          { selectedJob: job, message: null, resumeUrl: "" },
          false,
          "career/selectJob"
        ),

      // ── Filters ──────────────────────────────────────────────────────────────
      setSearchQuery: (query) =>
        set({ searchQuery: query }, false, "career/setSearchQuery"),

      setOpportunityType: (type) =>
        set({ opportunityType: type }, false, "career/setOpportunityType"),

      // ── Form ─────────────────────────────────────────────────────────────────
      setResumeUrl: (url) =>
        set({ resumeUrl: url }, false, "career/setResumeUrl"),

      setSubmitting: (submitting) =>
        set({ submitting }, false, "career/setSubmitting"),

      setMessage: (message) =>
        set({ message }, false, "career/setMessage"),

      // ── Applications ─────────────────────────────────────────────────────────
      setApplications: (apps) =>
        set({ applications: apps }, false, "career/setApplications"),

      addApplication: (app) =>
        set(
          (s) => ({ applications: [app, ...s.applications] }),
          false,
          "career/addApplication"
        ),

      resetApplyForm: () =>
        set({ resumeUrl: "", message: null }, false, "career/resetApplyForm"),

      // ── Derived ──────────────────────────────────────────────────────────────
      appliedJobIds: () =>
        new Set(get().applications.map((a) => a.jobId)),
    }),
    { name: "CareerStore" }
  )
);
