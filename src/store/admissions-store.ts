/**
 * @file admissions-store.ts
 * @description Zustand store for the Admissions Dashboard page.
 *
 * Replaces all useState calls in AdmissionsDashboard.tsx:
 *   - applications list (optimistic updates after approve/reject)
 *   - selectedApp, filterStatus, filterBatch, searchTerm
 *   - actionLoading, enrollmentResult, errorState
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdmissionApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: Date;
  batch: { id: string; name: string };
  payments: {
    id: string;
    amount: string;
    status: string;
    paymentMethod: string;
    transactionId: string | null;
  }[];
  // Extended fields present after getApplicationDetailsAction:
  academicHistory?: Record<string, any>;
  documents?: any[];
}

export interface EnrollmentResult {
  student?: { rollNumber: string; admissionNumber: string };
  temporaryPassword?: string;
}

interface AdmissionsState {
  // ── Data ─────────────────────────────────────────────────────────────────────
  applications: AdmissionApplication[];
  selectedApp: AdmissionApplication | null;

  // ── Filters ──────────────────────────────────────────────────────────────────
  filterStatus: string;
  filterBatch: string;
  searchTerm: string;

  // ── Async ────────────────────────────────────────────────────────────────────
  actionLoading: boolean;
  enrollmentResult: EnrollmentResult | null;
  errorState: string | null;

  // ── Actions: Data ────────────────────────────────────────────────────────────
  setApplications: (apps: AdmissionApplication[]) => void;
  setSelectedApp: (app: AdmissionApplication | null) => void;
  /** Optimistically update an application's status in the list. */
  updateApplicationStatus: (id: string, status: string) => void;

  // ── Actions: Filters ─────────────────────────────────────────────────────────
  setFilterStatus: (status: string) => void;
  setFilterBatch: (batch: string) => void;
  setSearchTerm: (term: string) => void;

  // ── Actions: Async ───────────────────────────────────────────────────────────
  setActionLoading: (loading: boolean) => void;
  setEnrollmentResult: (result: EnrollmentResult | null) => void;
  setErrorState: (error: string | null) => void;
  clearSelection: () => void;

  // ── Derived ──────────────────────────────────────────────────────────────────
  filteredApplications: () => AdmissionApplication[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAdmissionsStore = create<AdmissionsState>()(
  devtools(
    (set, get) => ({
      applications: [],
      selectedApp: null,
      filterStatus: "all",
      filterBatch: "all",
      searchTerm: "",
      actionLoading: false,
      enrollmentResult: null,
      errorState: null,

      // ── Data ─────────────────────────────────────────────────────────────────
      setApplications: (apps) =>
        set({ applications: apps }, false, "admissions/setApplications"),

      setSelectedApp: (app) =>
        set(
          { selectedApp: app, enrollmentResult: null, errorState: null },
          false,
          "admissions/setSelectedApp"
        ),

      updateApplicationStatus: (id, status) =>
        set(
          (s) => ({
            applications: s.applications.map((a) =>
              a.id === id ? { ...a, status } : a
            ),
          }),
          false,
          "admissions/updateApplicationStatus"
        ),

      // ── Filters ──────────────────────────────────────────────────────────────
      setFilterStatus: (status) =>
        set({ filterStatus: status }, false, "admissions/setFilterStatus"),

      setFilterBatch: (batch) =>
        set({ filterBatch: batch }, false, "admissions/setFilterBatch"),

      setSearchTerm: (term) =>
        set({ searchTerm: term }, false, "admissions/setSearchTerm"),

      // ── Async ────────────────────────────────────────────────────────────────
      setActionLoading: (loading) =>
        set({ actionLoading: loading }, false, "admissions/setActionLoading"),

      setEnrollmentResult: (result) =>
        set({ enrollmentResult: result }, false, "admissions/setEnrollmentResult"),

      setErrorState: (error) =>
        set({ errorState: error }, false, "admissions/setErrorState"),

      clearSelection: () =>
        set(
          { selectedApp: null, enrollmentResult: null, errorState: null },
          false,
          "admissions/clearSelection"
        ),

      // ── Derived ──────────────────────────────────────────────────────────────
      filteredApplications: () => {
        const { applications, filterStatus, filterBatch, searchTerm } = get();
        return applications.filter((app) => {
          const matchesStatus =
            filterStatus === "all" || app.status === filterStatus;
          const matchesBatch =
            filterBatch === "all" || app.batch.id === filterBatch;
          const q = searchTerm.toLowerCase();
          const matchesSearch =
            app.firstName.toLowerCase().includes(q) ||
            app.lastName.toLowerCase().includes(q) ||
            app.email.toLowerCase().includes(q);
          return matchesStatus && matchesBatch && matchesSearch;
        });
      },
    }),
    { name: "AdmissionsStore" }
  )
);
