/**
 * @file placement-store.ts
 * @description Zustand store for the Placement Console page.
 *
 * Replaces all useState calls in PlacementConsole.tsx:
 *   - activeTab, selectedJobId
 *   - create-job form fields
 *   - edit-job form fields and editingJob
 *   - loading, formMsg, updatingId
 *   - applicant filter: appSearch, statusFilter
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlacementTab = "list" | "create";

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary: string | null;
  location: string;
  isActive: boolean;
  createdAt: Date | string;
}

export interface JobFormFields {
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary: string;
  location: string;
}

const EMPTY_FORM: JobFormFields = {
  title: "",
  company: "",
  description: "",
  requirements: "",
  salary: "",
  location: "",
};

interface PlacementState {
  // ── Navigation ───────────────────────────────────────────────────────────────
  activeTab: PlacementTab;
  selectedJobId: string | null;

  // ── Create form ──────────────────────────────────────────────────────────────
  createForm: JobFormFields;
  formMsg: { type: "success" | "error"; text: string } | null;

  // ── Edit form ────────────────────────────────────────────────────────────────
  editingJob: JobPosting | null;
  editForm: JobFormFields;

  // ── Applicant filters ────────────────────────────────────────────────────────
  appSearch: string;
  appStatusFilter: string;

  // ── Async ────────────────────────────────────────────────────────────────────
  loading: boolean;
  updatingId: string | null;

  // ── Actions: Navigation ──────────────────────────────────────────────────────
  setActiveTab: (tab: PlacementTab) => void;
  setSelectedJobId: (id: string | null) => void;

  // ── Actions: Create form ─────────────────────────────────────────────────────
  setCreateField: (field: keyof JobFormFields, value: string) => void;
  resetCreateForm: () => void;
  setFormMsg: (msg: { type: "success" | "error"; text: string } | null) => void;

  // ── Actions: Edit form ───────────────────────────────────────────────────────
  openEditJob: (job: JobPosting) => void;
  setEditField: (field: keyof JobFormFields, value: string) => void;
  closeEditForm: () => void;

  // ── Actions: Applicant filters ───────────────────────────────────────────────
  setAppSearch: (term: string) => void;
  setAppStatusFilter: (status: string) => void;

  // ── Actions: Async ───────────────────────────────────────────────────────────
  setLoading: (loading: boolean) => void;
  setUpdatingId: (id: string | null) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePlacementStore = create<PlacementState>()(
  devtools(
    (set) => ({
      activeTab: "list",
      selectedJobId: null,
      createForm: { ...EMPTY_FORM },
      formMsg: null,
      editingJob: null,
      editForm: { ...EMPTY_FORM },
      appSearch: "",
      appStatusFilter: "all",
      loading: false,
      updatingId: null,

      // ── Navigation ───────────────────────────────────────────────────────────
      setActiveTab: (tab) =>
        set({ activeTab: tab }, false, "placement/setActiveTab"),

      setSelectedJobId: (id) =>
        set({ selectedJobId: id }, false, "placement/setSelectedJobId"),

      // ── Create form ──────────────────────────────────────────────────────────
      setCreateField: (field, value) =>
        set(
          (s) => ({ createForm: { ...s.createForm, [field]: value } }),
          false,
          "placement/setCreateField"
        ),

      resetCreateForm: () =>
        set(
          { createForm: { ...EMPTY_FORM }, formMsg: null },
          false,
          "placement/resetCreateForm"
        ),

      setFormMsg: (msg) =>
        set({ formMsg: msg }, false, "placement/setFormMsg"),

      // ── Edit form ────────────────────────────────────────────────────────────
      openEditJob: (job) =>
        set(
          {
            editingJob: job,
            editForm: {
              title: job.title,
              company: job.company,
              description: job.description,
              requirements: job.requirements,
              salary: job.salary || "",
              location: job.location,
            },
          },
          false,
          "placement/openEditJob"
        ),

      setEditField: (field, value) =>
        set(
          (s) => ({ editForm: { ...s.editForm, [field]: value } }),
          false,
          "placement/setEditField"
        ),

      closeEditForm: () =>
        set({ editingJob: null }, false, "placement/closeEditForm"),

      // ── Applicant filters ────────────────────────────────────────────────────
      setAppSearch: (term) =>
        set({ appSearch: term }, false, "placement/setAppSearch"),

      setAppStatusFilter: (status) =>
        set({ appStatusFilter: status }, false, "placement/setAppStatusFilter"),

      // ── Async ────────────────────────────────────────────────────────────────
      setLoading: (loading) =>
        set({ loading }, false, "placement/setLoading"),

      setUpdatingId: (id) =>
        set({ updatingId: id }, false, "placement/setUpdatingId"),
    }),
    { name: "PlacementStore" }
  )
);
