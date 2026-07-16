/**
 * @file gamification-store.ts
 * @description Zustand store for student gamification state.
 *
 * Replaces the localStorage reads/writes scattered across DashboardLayout
 * and lesson components. The store is persisted to localStorage via the
 * Zustand `persist` middleware so data survives page refreshes, and the
 * old `window.dispatchEvent("gamification-update")` pattern is no longer
 * needed — components subscribe directly to the store.
 *
 * Usage:
 *   const { xp, level, streakCount, awardXP } = useGamificationStore();
 */

"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: string; // ISO date string
}

interface GamificationState {
  // ── Core stats ─────────────────────────────────────────────────────────────
  xp: number;
  level: number;
  streakCount: number;
  lastActivityDate: string | null; // ISO date string

  // ── Badges ─────────────────────────────────────────────────────────────────
  badges: Badge[];

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Award XP and auto-level-up if threshold is crossed (100 XP per level). */
  awardXP: (amount: number) => void;
  /** Increment streak if last activity was yesterday; reset if more than 1 day gap. */
  recordActivity: () => void;
  /** Directly set all stats at once (used during initial hydration). */
  hydrate: (stats: { xp: number; level: number; streakCount: number }) => void;
  /** Add a badge if the student doesn't already have it. */
  earnBadge: (badge: Omit<Badge, "earnedAt">) => void;
  /** Reset everything (used when a student logs out or changes tenant). */
  reset: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 100;

function calcLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGamificationStore = create<GamificationState>()(
  devtools(
    persist(
      (set, get) => ({
        xp: 0,
        level: 1,
        streakCount: 0,
        lastActivityDate: null,
        badges: [],

        awardXP: (amount) =>
          set(
            (s) => {
              const newXp = s.xp + amount;
              return { xp: newXp, level: calcLevel(newXp) };
            },
            false,
            "gamification/awardXP"
          ),

        recordActivity: () =>
          set(
            (s) => {
              const today = todayISO();
              if (s.lastActivityDate === today) {
                // Already recorded today — no change.
                return {};
              }
              const streakCount =
                s.lastActivityDate === yesterdayISO()
                  ? s.streakCount + 1
                  : 1; // Reset streak if gap > 1 day.
              return { streakCount, lastActivityDate: today };
            },
            false,
            "gamification/recordActivity"
          ),

        hydrate: ({ xp, level, streakCount }) =>
          set({ xp, level, streakCount }, false, "gamification/hydrate"),

        earnBadge: (badge) =>
          set(
            (s) => {
              if (s.badges.some((b) => b.id === badge.id)) return {};
              return {
                badges: [
                  ...s.badges,
                  { ...badge, earnedAt: new Date().toISOString() },
                ],
              };
            },
            false,
            "gamification/earnBadge"
          ),

        reset: () =>
          set(
            { xp: 0, level: 1, streakCount: 0, lastActivityDate: null, badges: [] },
            false,
            "gamification/reset"
          ),
      }),
      {
        name: "wysbryx-gamification", // localStorage key
      }
    ),
    { name: "GamificationStore" }
  )
);
