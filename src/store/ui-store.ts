/**
 * @file ui-store.ts
 * @description Zustand store for global UI state.
 *
 * Replaces scattered `useState` calls in DashboardLayout and other shell
 * components for sidebar visibility, mobile menu, command palette, theme
 * preference, and toast-style notifications.
 */

"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeMode = "dark" | "light" | "system";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "error";
  /** Auto-dismiss after this many ms. 0 = no auto-dismiss. */
  duration?: number;
}

interface UIState {
  // ── Sidebar ───────────────────────────────────────────────────────────────
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;

  // ── Command palette ───────────────────────────────────────────────────────
  isCommandPaletteOpen: boolean;

  // ── Theme ─────────────────────────────────────────────────────────────────
  themeMode: ThemeMode;

  // ── Toast queue ───────────────────────────────────────────────────────────
  toasts: Toast[];

  // ── Actions: Sidebar ──────────────────────────────────────────────────────
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;

  // ── Actions: Command palette ──────────────────────────────────────────────
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // ── Actions: Theme ────────────────────────────────────────────────────────
  setThemeMode: (mode: ThemeMode) => void;

  // ── Actions: Toast ────────────────────────────────────────────────────────
  addToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

let toastIdCounter = 0;

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        isSidebarCollapsed: false,
        isMobileMenuOpen: false,
        isCommandPaletteOpen: false,
        themeMode: "dark",
        toasts: [],

        // ── Sidebar ─────────────────────────────────────────────────────────
        toggleSidebar: () =>
          set(
            (s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed }),
            false,
            "ui/toggleSidebar"
          ),
        collapseSidebar: () =>
          set({ isSidebarCollapsed: true }, false, "ui/collapseSidebar"),
        expandSidebar: () =>
          set({ isSidebarCollapsed: false }, false, "ui/expandSidebar"),
        toggleMobileMenu: () =>
          set(
            (s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen }),
            false,
            "ui/toggleMobileMenu"
          ),
        closeMobileMenu: () =>
          set({ isMobileMenuOpen: false }, false, "ui/closeMobileMenu"),

        // ── Command palette ──────────────────────────────────────────────────
        openCommandPalette: () =>
          set({ isCommandPaletteOpen: true }, false, "ui/openCommandPalette"),
        closeCommandPalette: () =>
          set({ isCommandPaletteOpen: false }, false, "ui/closeCommandPalette"),
        toggleCommandPalette: () =>
          set(
            (s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen }),
            false,
            "ui/toggleCommandPalette"
          ),

        // ── Theme ────────────────────────────────────────────────────────────
        setThemeMode: (mode) =>
          set({ themeMode: mode }, false, "ui/setThemeMode"),

        // ── Toast ────────────────────────────────────────────────────────────
        addToast: (toast) => {
          const id = `toast-${++toastIdCounter}`;
          set(
            (s) => ({ toasts: [...s.toasts, { ...toast, id }] }),
            false,
            "ui/addToast"
          );
          const duration = toast.duration ?? 4000;
          if (duration > 0) {
            setTimeout(() => get().dismissToast(id), duration);
          }
        },
        dismissToast: (id) =>
          set(
            (s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }),
            false,
            "ui/dismissToast"
          ),
        clearToasts: () =>
          set({ toasts: [] }, false, "ui/clearToasts"),
      }),
      {
        name: "wysbryx-ui",
        // Only persist theme preference and sidebar state across sessions.
        partialize: (s) => ({
          isSidebarCollapsed: s.isSidebarCollapsed,
          themeMode: s.themeMode,
        }),
      }
    ),
    { name: "UIStore" }
  )
);
