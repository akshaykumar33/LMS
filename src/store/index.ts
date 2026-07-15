/**
 * @file index.ts
 * @description Barrel export for all Zustand stores.
 *
 * Import from "@/store" rather than individual files to keep imports tidy.
 *
 * Example:
 *   import { useAuthStore, useTenantStore, useUIStore } from "@/store";
 */

export { useAuthStore }           from "./auth-store";
export type { AuthUser, UserRole } from "./auth-store";

export { useTenantStore }                                                from "./tenant-store";
export type { TenantInfo, TenantBranding, TenantFeatures, TenantGateways, TenantRestrictions } from "./tenant-store";

export { useUIStore }             from "./ui-store";
export type { ThemeMode, Toast }  from "./ui-store";

export { useGamificationStore }   from "./gamification-store";
export type { Badge }             from "./gamification-store";

export { useNotificationStore }   from "./notification-store";
export type { AppNotification }   from "./notification-store";

// Hydrator components (client-only — used inside Server Component trees)
export { AuthHydrator, TenantHydrator, GamificationHydrator } from "./hydrators";
