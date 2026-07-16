/**
 * @file quiz-store.ts
 * @description Zustand store for the Quiz Workspace.
 *
 * Replaces all useState calls in QuizWorkspace.tsx:
 *   - step, currentIdx, answers
 *   - loading, error, resultsData
 *   - unlockedCert, certCode
 *   - infractionCount, proctorWarning
 *
 * The store is intentionally reset on every quiz start (handleStart),
 * so persistent middleware is not used.
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type QuizStep = "intro" | "questions" | "results";

// ─── State ─────────────────────────────────────────────────────────────────────

interface QuizState {
  // ── Quiz flow ─────────────────────────────────────────────────────────────
  step: QuizStep;
  currentIdx: number;
  /** questionId → selectedOptionId */
  answers: Record<string, string>;

  // ── Async ─────────────────────────────────────────────────────────────────
  loading: boolean;
  error: string | null;
  resultsData: any | null;

  // ── Certificate ───────────────────────────────────────────────────────────
  unlockedCert: boolean;
  certCode: string;

  // ── Proctoring ────────────────────────────────────────────────────────────
  infractionCount: number;
  proctorWarning: string | null;

  // ── Actions: quiz flow ────────────────────────────────────────────────────
  /** Reset all state and move to the "questions" step. */
  startQuiz: () => void;
  setCurrentIdx: (idx: number) => void;
  selectOption: (questionId: string, optionId: string) => void;
  setStep: (step: QuizStep) => void;

  // ── Actions: async ────────────────────────────────────────────────────────
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setResultsData: (data: any | null) => void;

  // ── Actions: certificate ──────────────────────────────────────────────────
  setUnlockedCert: (v: boolean) => void;
  setCertCode: (code: string) => void;

  // ── Actions: proctoring ───────────────────────────────────────────────────
  incrementInfraction: () => number;
  setProctorWarning: (msg: string | null) => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useQuizStore = create<QuizState>()(
  devtools(
    (set, get) => ({
      step: "intro",
      currentIdx: 0,
      answers: {},
      loading: false,
      error: null,
      resultsData: null,
      unlockedCert: false,
      certCode: "",
      infractionCount: 0,
      proctorWarning: null,

      // ── Quiz flow ──────────────────────────────────────────────────────────
      startQuiz: () =>
        set(
          {
            step: "questions",
            currentIdx: 0,
            answers: {},
            error: null,
            resultsData: null,
            unlockedCert: false,
            certCode: "",
            infractionCount: 0,
            proctorWarning: null,
          },
          false,
          "quiz/startQuiz"
        ),

      setCurrentIdx: (idx) =>
        set({ currentIdx: idx }, false, "quiz/setCurrentIdx"),

      selectOption: (questionId, optionId) =>
        set(
          (s) => ({ answers: { ...s.answers, [questionId]: optionId } }),
          false,
          "quiz/selectOption"
        ),

      setStep: (step) =>
        set({ step }, false, "quiz/setStep"),

      // ── Async ──────────────────────────────────────────────────────────────
      setLoading: (v) =>
        set({ loading: v }, false, "quiz/setLoading"),

      setError: (msg) =>
        set({ error: msg }, false, "quiz/setError"),

      setResultsData: (data) =>
        set({ resultsData: data }, false, "quiz/setResultsData"),

      // ── Certificate ────────────────────────────────────────────────────────
      setUnlockedCert: (v) =>
        set({ unlockedCert: v }, false, "quiz/setUnlockedCert"),

      setCertCode: (code) =>
        set({ certCode: code }, false, "quiz/setCertCode"),

      // ── Proctoring ─────────────────────────────────────────────────────────
      incrementInfraction: () => {
        const next = get().infractionCount + 1;
        set({ infractionCount: next }, false, "quiz/incrementInfraction");
        return next;
      },

      setProctorWarning: (msg) =>
        set({ proctorWarning: msg }, false, "quiz/setProctorWarning"),
    }),
    { name: "QuizStore" }
  )
);
