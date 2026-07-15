/**
 * @file notification-store.ts
 * @description Zustand store for in-app notifications.
 *
 * Manages the notification list fetched from the SSE stream at
 * `/api/notifications/stream` and the REST actions (mark-read, clear).
 *
 * The NotificationBell component connects the SSE stream and pushes
 * incoming events into this store via `addNotification()`.
 *
 * Usage:
 *   const { notifications, unreadCount, markRead } = useNotificationStore();
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  isRead: boolean;
  createdAt: string; // ISO date string
}

interface NotificationState {
  notifications: AppNotification[];
  /** Whether the initial bulk-load from the API is in progress. */
  isLoading: boolean;
  /** SSE connection status. */
  isConnected: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Bulk-load notifications fetched from an API call (replaces list). */
  setNotifications: (items: AppNotification[]) => void;
  /** Append a single notification (from SSE push). */
  addNotification: (item: AppNotification) => void;
  /** Mark one notification as read. */
  markRead: (id: string) => void;
  /** Mark all notifications as read. */
  markAllRead: () => void;
  /** Remove a single notification from the list. */
  remove: (id: string) => void;
  /** Clear all notifications from the list. */
  clear: () => void;
  /** Set SSE connection state. */
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;

  // ── Derived ────────────────────────────────────────────────────────────────
  unreadCount: () => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],
      isLoading: false,
      isConnected: false,

      setNotifications: (items) =>
        set({ notifications: items, isLoading: false }, false, "notification/set"),

      addNotification: (item) =>
        set(
          (s) => ({
            // Prevent duplicates on reconnect
            notifications: s.notifications.some((n) => n.id === item.id)
              ? s.notifications
              : [item, ...s.notifications],
          }),
          false,
          "notification/add"
        ),

      markRead: (id) =>
        set(
          (s) => ({
            notifications: s.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n
            ),
          }),
          false,
          "notification/markRead"
        ),

      markAllRead: () =>
        set(
          (s) => ({
            notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
          }),
          false,
          "notification/markAllRead"
        ),

      remove: (id) =>
        set(
          (s) => ({
            notifications: s.notifications.filter((n) => n.id !== id),
          }),
          false,
          "notification/remove"
        ),

      clear: () =>
        set({ notifications: [] }, false, "notification/clear"),

      setConnected: (connected) =>
        set({ isConnected: connected }, false, "notification/setConnected"),

      setLoading: (loading) =>
        set({ isLoading: loading }, false, "notification/setLoading"),

      // ── Derived ─────────────────────────────────────────────────────────────
      unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
    }),
    { name: "NotificationStore" }
  )
);
