/**
 * @file auth-store.ts
 * @description Zustand store for client-side auth state.
 *
 * NOTE: The source of truth for authentication is the server — JWT tokens live in
 * HttpOnly cookies and are validated server-side via `getCurrentUser()`.
 * This store holds a *hydrated snapshot* of the current user so client
 * components can read it without a round-trip.
 *
 * Hydration pattern:
 *   1. A Server Component reads the session and passes the user as a prop.
 *   2. A client `<AuthHydrator user={user} />` component calls `hydrate()` once.
 *   3. All client components consume state via `useAuthStore()`.
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  tenantId: string | null;
  subdomain: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

export type UserRole =
  | "SuperAdmin"
  | "Owner"
  | "Admin"
  | "Program Manager"
  | "Faculty"
  | "Mentor"
  | "Placement Officer"
  | "Student"
  | "Guest";

interface AuthState {
  /** Hydrated user snapshot. `null` means unauthenticated (or not yet hydrated). */
  user: AuthUser | null;
  /** True while the initial hydration call is in-flight. */
  isLoading: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Populate the store from a server-resolved user payload. */
  hydrate: (user: AuthUser | null) => void;
  /** Clear the store on logout (does NOT revoke the cookie — call `logoutAction()` first). */
  clear: () => void;
  /** Update specific fields without a full re-hydration (e.g. after a profile save). */
  patch: (partial: Partial<AuthUser>) => void;

  // ── Derived helpers ───────────────────────────────────────────────────────
  isAuthenticated: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  isGuest: () => boolean;
  isSuperAdmin: () => boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      isLoading: true,

      hydrate: (user) =>
        set({ user, isLoading: false }, false, "auth/hydrate"),

      clear: () =>
        set({ user: null, isLoading: false }, false, "auth/clear"),

      patch: (partial) =>
        set(
          (state) => ({
            user: state.user ? { ...state.user, ...partial } : state.user,
          }),
          false,
          "auth/patch"
        ),

      // ── Derived ────────────────────────────────────────────────────────────
      isAuthenticated: () => get().user !== null,
      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
      isGuest: () => get().user?.role === "Guest",
      isSuperAdmin: () => get().user?.role === "SuperAdmin",
    }),
    { name: "AuthStore" }
  )
);
