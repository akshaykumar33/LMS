/**
 * @file faculty-store.ts
 * @description Zustand store for the Faculty Dashboard client.
 *
 * Replaces all useState calls in FacultyDashboardClient.tsx:
 *   - activeTab
 *   - selectedStudentId, isModalOpen
 *   - submissionsList, selectedSubmission
 *   - gradeStatus, gradeScore, gradeFeedback
 *   - isGradingSubmitting, gradingMessage
 *   - rosterSearch, attemptsSearch
 *   - proctorAttempts, selectedProctorAttempt, proctorSearchTerm
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type FacultyTab =
  | "overview"
  | "roster"
  | "submissions"
  | "proctoring"
  | "schedule"
  | "curriculum"
  | "subjective";

export interface ProctorEvent {
  type: string;
  time: string;
  desc: string;
}

export interface ProctorAttempt {
  id: string;
  studentName: string;
  quizTitle: string;
  status: "flagged" | "cleared";
  infractionCount: number;
  lastUpdated: string;
  events: ProctorEvent[];
}

export type GradeStatus = "approved" | "failed";

export interface GradingMessage {
  type: "success" | "error";
  text: string;
}

// ─── Default proctor data (static seed — real data would come from the server) ──

const DEFAULT_PROCTOR_ATTEMPTS: ProctorAttempt[] = [
  {
    id: "pr-101",
    studentName: "Linus Torvalds",
    quizTitle: "Semiconductor Module 1 Quiz",
    status: "flagged",
    infractionCount: 3,
    lastUpdated: "2026-07-14T10:12:00Z",
    events: [
      { type: "Tab Switch", time: "10:14:02 AM", desc: "User switched focus out of browser tab for 12 seconds." },
      { type: "Fullscreen Exit", time: "10:15:20 AM", desc: "User left full-screen exam mode." },
      { type: "Face Detection Alert", time: "10:16:45 AM", desc: "No face detected in webcam feed." },
    ],
  },
  {
    id: "pr-102",
    studentName: "Ada Lovelace",
    quizTitle: "VLSI Circuit Layout Evaluation",
    status: "cleared",
    infractionCount: 0,
    lastUpdated: "2026-07-14T09:45:00Z",
    events: [
      { type: "Exam Started", time: "09:40:00 AM", desc: "Initial verification verified learner credentials successfully." },
    ],
  },
  {
    id: "pr-103",
    studentName: "Gordon Moore",
    quizTitle: "Lithography Diffraction Quiz",
    status: "flagged",
    infractionCount: 1,
    lastUpdated: "2026-07-14T11:05:00Z",
    events: [
      { type: "Tab Switch", time: "11:07:35 AM", desc: "User switched focus out of browser tab for 5 seconds." },
    ],
  },
];

// ─── State ─────────────────────────────────────────────────────────────────────

interface FacultyState {
  // ── Navigation ────────────────────────────────────────────────────────────
  activeTab: FacultyTab;

  // ── Student profile modal ─────────────────────────────────────────────────
  selectedStudentId: string | null;
  isModalOpen: boolean;

  // ── Capstone submissions ──────────────────────────────────────────────────
  submissionsList: any[];
  selectedSubmission: any | null;

  // ── Grading form ──────────────────────────────────────────────────────────
  gradeStatus: GradeStatus;
  gradeScore: number;
  gradeFeedback: string;
  isGradingSubmitting: boolean;
  gradingMessage: GradingMessage | null;

  // ── Search terms ──────────────────────────────────────────────────────────
  rosterSearch: string;
  attemptsSearch: string;

  // ── Proctoring ────────────────────────────────────────────────────────────
  proctorAttempts: ProctorAttempt[];
  selectedProctorAttempt: ProctorAttempt | null;
  proctorSearchTerm: string;

  // ── Actions: navigation ───────────────────────────────────────────────────
  setActiveTab: (tab: FacultyTab) => void;

  // ── Actions: student modal ────────────────────────────────────────────────
  openStudentModal: (studentId: string) => void;
  closeStudentModal: () => void;

  // ── Actions: submissions ──────────────────────────────────────────────────
  setSubmissionsList: (list: any[]) => void;
  openGradeModal: (submission: any) => void;
  closeGradeModal: () => void;
  /** Optimistically update a submission's grade in the list. */
  applyGrade: (submissionId: string, status: GradeStatus, grade: number, feedback: string) => void;

  // ── Actions: grading form ─────────────────────────────────────────────────
  setGradeStatus: (v: GradeStatus) => void;
  setGradeScore: (v: number) => void;
  setGradeFeedback: (v: string) => void;
  setIsGradingSubmitting: (v: boolean) => void;
  setGradingMessage: (msg: GradingMessage | null) => void;

  // ── Actions: search ───────────────────────────────────────────────────────
  setRosterSearch: (v: string) => void;
  setAttemptsSearch: (v: string) => void;

  // ── Actions: proctoring ───────────────────────────────────────────────────
  setProctorAttempts: (attempts: ProctorAttempt[]) => void;
  clearProctorAttempt: (id: string) => void;
  openProctorAudit: (attempt: ProctorAttempt) => void;
  closeProctorAudit: () => void;
  setProctorSearchTerm: (v: string) => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useFacultyStore = create<FacultyState>()(
  devtools(
    (set) => ({
      activeTab: "overview",
      selectedStudentId: null,
      isModalOpen: false,
      submissionsList: [],
      selectedSubmission: null,
      gradeStatus: "approved",
      gradeScore: 90,
      gradeFeedback: "",
      isGradingSubmitting: false,
      gradingMessage: null,
      rosterSearch: "",
      attemptsSearch: "",
      proctorAttempts: DEFAULT_PROCTOR_ATTEMPTS,
      selectedProctorAttempt: null,
      proctorSearchTerm: "",

      // ── Navigation ──────────────────────────────────────────────────────
      setActiveTab: (tab) =>
        set({ activeTab: tab }, false, "faculty/setActiveTab"),

      // ── Student modal ────────────────────────────────────────────────────
      openStudentModal: (studentId) =>
        set({ selectedStudentId: studentId, isModalOpen: true }, false, "faculty/openStudentModal"),

      closeStudentModal: () =>
        set({ isModalOpen: false, selectedStudentId: null }, false, "faculty/closeStudentModal"),

      // ── Submissions ──────────────────────────────────────────────────────
      setSubmissionsList: (list) =>
        set({ submissionsList: list }, false, "faculty/setSubmissionsList"),

      openGradeModal: (submission) =>
        set(
          {
            selectedSubmission: submission,
            gradeStatus: submission.status === "failed" ? "failed" : "approved",
            gradeScore: submission.grade ? parseInt(submission.grade) : 90,
            gradeFeedback: submission.feedback || "",
            gradingMessage: null,
          },
          false,
          "faculty/openGradeModal"
        ),

      closeGradeModal: () =>
        set({ selectedSubmission: null, gradingMessage: null }, false, "faculty/closeGradeModal"),

      applyGrade: (submissionId, status, grade, feedback) =>
        set(
          (s) => ({
            submissionsList: s.submissionsList.map((sub) =>
              sub.id === submissionId
                ? { ...sub, status, grade: grade.toString(), feedback }
                : sub
            ),
          }),
          false,
          "faculty/applyGrade"
        ),

      // ── Grading form ─────────────────────────────────────────────────────
      setGradeStatus: (v) =>
        set({ gradeStatus: v }, false, "faculty/setGradeStatus"),

      setGradeScore: (v) =>
        set({ gradeScore: v }, false, "faculty/setGradeScore"),

      setGradeFeedback: (v) =>
        set({ gradeFeedback: v }, false, "faculty/setGradeFeedback"),

      setIsGradingSubmitting: (v) =>
        set({ isGradingSubmitting: v }, false, "faculty/setIsGradingSubmitting"),

      setGradingMessage: (msg) =>
        set({ gradingMessage: msg }, false, "faculty/setGradingMessage"),

      // ── Search ───────────────────────────────────────────────────────────
      setRosterSearch: (v) =>
        set({ rosterSearch: v }, false, "faculty/setRosterSearch"),

      setAttemptsSearch: (v) =>
        set({ attemptsSearch: v }, false, "faculty/setAttemptsSearch"),

      // ── Proctoring ───────────────────────────────────────────────────────
      setProctorAttempts: (attempts) =>
        set({ proctorAttempts: attempts }, false, "faculty/setProctorAttempts"),

      clearProctorAttempt: (id) =>
        set(
          (s) => ({
            proctorAttempts: s.proctorAttempts.map((p) =>
              p.id === id ? { ...p, status: "cleared" as const, infractionCount: 0 } : p
            ),
          }),
          false,
          "faculty/clearProctorAttempt"
        ),

      openProctorAudit: (attempt) =>
        set({ selectedProctorAttempt: attempt }, false, "faculty/openProctorAudit"),

      closeProctorAudit: () =>
        set({ selectedProctorAttempt: null }, false, "faculty/closeProctorAudit"),

      setProctorSearchTerm: (v) =>
        set({ proctorSearchTerm: v }, false, "faculty/setProctorSearchTerm"),
    }),
    { name: "FacultyStore" }
  )
);
