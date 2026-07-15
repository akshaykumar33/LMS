/**
 * @file course-manager-store.ts
 * @description Zustand store for the Course Manager Console.
 *
 * Replaces all useState calls in CourseManagerConsole.tsx:
 *   - courses (optimistic list), selectedCourse
 *   - editingCourse, editingModule, editingLesson, editingCapstone
 *   - isSubmitting, feedback
 *   - scormUploading, courseScormUploading
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  contentType: string;
  content: string | null;
  videoUrl: string | null;
  fileUrl?: string | null;
  order: number;
}

export interface CourseModule {
  id: string;
  name: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tenantName?: string;
  scormEnabled?: boolean;
  scormPackageUrl?: string | null;
  capstoneProject?: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    durationWeeks: number;
  } | null;
  modules: CourseModule[];
}

export interface CourseFeedback {
  type: "success" | "error";
  text: string;
}

// ─── State ─────────────────────────────────────────────────────────────────────

interface CourseManagerState {
  // ── Data ───────────────────────────────────────────────────────────────────
  courses: Course[];
  selectedCourse: Course | null;

  // ── Editing targets ────────────────────────────────────────────────────────
  editingCourse: Course | null;
  editingModule: CourseModule | null;
  editingLesson: Lesson | null;
  editingCapstone: any | null;

  // ── Async & feedback ───────────────────────────────────────────────────────
  isSubmitting: boolean;
  feedback: CourseFeedback | null;
  scormUploading: boolean;
  courseScormUploading: boolean;

  // ── Actions: data ──────────────────────────────────────────────────────────
  setCourses: (courses: Course[]) => void;
  setSelectedCourse: (course: Course | null) => void;
  /** Optimistically replace a course in the list and update selectedCourse. */
  updateCourseInList: (updated: Course) => void;

  // ── Actions: editing targets ───────────────────────────────────────────────
  openEditCourse: (course: Course) => void;
  patchEditingCourse: (patch: Partial<Course>) => void;
  closeEditCourse: () => void;

  openEditModule: (mod: CourseModule) => void;
  patchEditingModule: (patch: Partial<CourseModule>) => void;
  closeEditModule: () => void;

  openEditLesson: (lesson: Lesson) => void;
  patchEditingLesson: (patch: Partial<Lesson>) => void;
  closeEditLesson: () => void;

  openEditCapstone: (capstone: any) => void;
  patchEditingCapstone: (patch: Record<string, any>) => void;
  closeEditCapstone: () => void;

  /** Close all editing panels at once (e.g. when selecting a different course). */
  closeAllEditors: () => void;

  // ── Actions: async & feedback ──────────────────────────────────────────────
  setIsSubmitting: (v: boolean) => void;
  showFeedback: (text: string, type?: "success" | "error") => void;
  clearFeedback: () => void;
  setScormUploading: (v: boolean) => void;
  setCourseScormUploading: (v: boolean) => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useCourseManagerStore = create<CourseManagerState>()(
  devtools(
    (set, get) => ({
      courses: [],
      selectedCourse: null,
      editingCourse: null,
      editingModule: null,
      editingLesson: null,
      editingCapstone: null,
      isSubmitting: false,
      feedback: null,
      scormUploading: false,
      courseScormUploading: false,

      // ── Data ─────────────────────────────────────────────────────────────
      setCourses: (courses) =>
        set({ courses, selectedCourse: courses[0] ?? null }, false, "courseManager/setCourses"),

      setSelectedCourse: (course) =>
        set({ selectedCourse: course }, false, "courseManager/setSelectedCourse"),

      updateCourseInList: (updated) =>
        set(
          (s) => ({
            courses: s.courses.map((c) => (c.id === updated.id ? updated : c)),
            selectedCourse: s.selectedCourse?.id === updated.id ? updated : s.selectedCourse,
          }),
          false,
          "courseManager/updateCourseInList"
        ),

      // ── Editing: course ───────────────────────────────────────────────────
      openEditCourse: (course) =>
        set(
          { editingCourse: course, editingModule: null, editingLesson: null, editingCapstone: null },
          false,
          "courseManager/openEditCourse"
        ),

      patchEditingCourse: (patch) =>
        set(
          (s) =>
            s.editingCourse ? { editingCourse: { ...s.editingCourse, ...patch } } : {},
          false,
          "courseManager/patchEditingCourse"
        ),

      closeEditCourse: () =>
        set({ editingCourse: null }, false, "courseManager/closeEditCourse"),

      // ── Editing: module ───────────────────────────────────────────────────
      openEditModule: (mod) =>
        set(
          { editingModule: mod, editingCourse: null, editingLesson: null, editingCapstone: null },
          false,
          "courseManager/openEditModule"
        ),

      patchEditingModule: (patch) =>
        set(
          (s) =>
            s.editingModule ? { editingModule: { ...s.editingModule, ...patch } } : {},
          false,
          "courseManager/patchEditingModule"
        ),

      closeEditModule: () =>
        set({ editingModule: null }, false, "courseManager/closeEditModule"),

      // ── Editing: lesson ───────────────────────────────────────────────────
      openEditLesson: (lesson) =>
        set(
          { editingLesson: lesson, editingCourse: null, editingModule: null, editingCapstone: null },
          false,
          "courseManager/openEditLesson"
        ),

      patchEditingLesson: (patch) =>
        set(
          (s) =>
            s.editingLesson ? { editingLesson: { ...s.editingLesson, ...patch } } : {},
          false,
          "courseManager/patchEditingLesson"
        ),

      closeEditLesson: () =>
        set({ editingLesson: null }, false, "courseManager/closeEditLesson"),

      // ── Editing: capstone ─────────────────────────────────────────────────
      openEditCapstone: (capstone) =>
        set(
          { editingCapstone: capstone, editingCourse: null, editingModule: null, editingLesson: null },
          false,
          "courseManager/openEditCapstone"
        ),

      patchEditingCapstone: (patch) =>
        set(
          (s) =>
            s.editingCapstone ? { editingCapstone: { ...s.editingCapstone, ...patch } } : {},
          false,
          "courseManager/patchEditingCapstone"
        ),

      closeEditCapstone: () =>
        set({ editingCapstone: null }, false, "courseManager/closeEditCapstone"),

      closeAllEditors: () =>
        set(
          { editingCourse: null, editingModule: null, editingLesson: null, editingCapstone: null },
          false,
          "courseManager/closeAllEditors"
        ),

      // ── Async & feedback ──────────────────────────────────────────────────
      setIsSubmitting: (v) =>
        set({ isSubmitting: v }, false, "courseManager/setIsSubmitting"),

      showFeedback: (text, type = "success") => {
        set({ feedback: { text, type } }, false, "courseManager/showFeedback");
        setTimeout(() => get().clearFeedback(), 4000);
      },

      clearFeedback: () =>
        set({ feedback: null }, false, "courseManager/clearFeedback"),

      setScormUploading: (v) =>
        set({ scormUploading: v }, false, "courseManager/setScormUploading"),

      setCourseScormUploading: (v) =>
        set({ courseScormUploading: v }, false, "courseManager/setCourseScormUploading"),
    }),
    { name: "CourseManagerStore" }
  )
);
