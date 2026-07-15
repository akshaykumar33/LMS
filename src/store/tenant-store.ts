/**
 * @file tenant-store.ts
 * @description Zustand store for client-side tenant context.
 *
 * The active tenant is resolved server-side via `getTenantContext()` using
 * the `x-tenant-subdomain` header / cookie.  This store holds a hydrated
 * copy so client components (DashboardLayout, BrandLogo, ThemeSwitcher …)
 * can access branding and feature-flags without prop-drilling.
 *
 * Hydration:
 *   A `<TenantHydrator tenant={tenant} />` client component (rendered by the
 *   root Server Component) calls `hydrate()` once on mount.
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
}

export interface TenantFeatures {
  enableLibrary?: boolean;
  enablePlacement?: boolean;
  enableProctoring?: boolean;
  enableCertificates?: boolean;
  enableCapstone?: boolean;
}

export interface TenantGateways {
  stripe?: boolean;
  razorpay?: boolean;
  paypal?: boolean;
}

export interface TenantRestrictions {
  maxUsers?: number;
  maxCourses?: number;
  allowSelfSignup?: boolean;
}

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  parentTenantId: string | null;
  branding: TenantBranding | null;
  status: string;
  isPlacementEnabled: boolean;
  /** True when this tenant has child sub-tenants (resolved by the caller). */
  isParentOrg?: boolean;
  settings?: {
    features?: TenantFeatures;
    gateways?: TenantGateways;
    restrictions?: TenantRestrictions;
  } | null;
}

interface TenantState {
  tenant: TenantInfo | null;
  isLoading: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────
  hydrate: (tenant: TenantInfo | null) => void;
  clear: () => void;

  // ── Derived helpers ───────────────────────────────────────────────────────
  /** Returns the active primary brand colour or a sensible default. */
  primaryColor: () => string;
  /** Feature-flag helper. */
  isFeatureEnabled: (flag: keyof TenantFeatures) => boolean;
  /** Payment gateway helper. */
  isGatewayEnabled: (gateway: keyof TenantGateways) => boolean;
  isSuspended: () => boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTenantStore = create<TenantState>()(
  devtools(
    (set, get) => ({
      tenant: null,
      isLoading: true,

      hydrate: (tenant) =>
        set({ tenant, isLoading: false }, false, "tenant/hydrate"),

      clear: () =>
        set({ tenant: null, isLoading: false }, false, "tenant/clear"),

      // ── Derived ────────────────────────────────────────────────────────────
      primaryColor: () =>
        get().tenant?.branding?.primaryColor ?? "#f97316",

      isFeatureEnabled: (flag) =>
        get().tenant?.settings?.features?.[flag] ?? false,

      isGatewayEnabled: (gateway) =>
        get().tenant?.settings?.gateways?.[gateway] ?? false,

      isSuspended: () => get().tenant?.status === "suspended",
    }),
    { name: "TenantStore" }
  )
);
