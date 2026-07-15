/**
 * @file hydrators.tsx
 * @description Thin client components that hydrate Zustand stores from
 * server-resolved data.
 *
 * Why a separate file?
 *   Server Components cannot import Zustand (it uses browser APIs), so we
 *   render these tiny "use client" components as leaves inside Server
 *   Component trees.  They call store actions on mount and render nothing.
 *
 * Usage in a Server Component:
 *
 *   import { AuthHydrator, TenantHydrator } from "@/store/hydrators";
 *
 *   export default async function Layout({ children }) {
 *     const user   = await getCurrentUser();
 *     const tenant = await getTenantContext();
 *     return (
 *       <>
 *         <AuthHydrator   user={user}   />
 *         <TenantHydrator tenant={tenant} />
 *         {children}
 *       </>
 *     );
 *   }
 */

"use client";

import { useEffect } from "react";
import { useAuthStore, type AuthUser } from "./auth-store";
import { useTenantStore, type TenantInfo } from "./tenant-store";
import { useGamificationStore } from "./gamification-store";

// ─── Auth Hydrator ─────────────────────────────────────────────────────────────

interface AuthHydratorProps {
  user: AuthUser | null;
}

export function AuthHydrator({ user }: AuthHydratorProps) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate(user);
  }, [hydrate, user]);

  return null;
}

// ─── Tenant Hydrator ──────────────────────────────────────────────────────────

interface TenantHydratorProps {
  tenant: TenantInfo | null;
}

export function TenantHydrator({ tenant }: TenantHydratorProps) {
  const hydrate = useTenantStore((s) => s.hydrate);

  useEffect(() => {
    hydrate(tenant);
  }, [hydrate, tenant]);

  return null;
}

// ─── Gamification Hydrator ────────────────────────────────────────────────────
// Used when the student's saved stats are fetched server-side from the DB.

interface GamificationHydratorProps {
  xp: number;
  level: number;
  streakCount: number;
}

export function GamificationHydrator({ xp, level, streakCount }: GamificationHydratorProps) {
  const hydrate = useGamificationStore((s) => s.hydrate);

  useEffect(() => {
    hydrate({ xp, level, streakCount });
  }, [hydrate, xp, level, streakCount]);

  return null;
}
