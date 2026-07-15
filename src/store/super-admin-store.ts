/**
 * @file super-admin-store.ts
 * @description Zustand store for the SuperAdmin console page.
 *
 * Replaces all useState calls in SuperAdminConsole.tsx:
 *   - tenantsList, searchTerm, selectedTenant, activeMainTab, activeSubTab
 *   - modal visibility flags (showCreateForm, showEditForm)
 *   - permissions matrix state
 *   - DB health / analytics tab state
 *   - isLoading
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantRecord {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
  } | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  parentTenantId: string | null;
  dbName?: string | null;
  settings?: {
    features?: {
      enableLibrary: boolean;
      enablePlacement: boolean;
      enableProctoring: boolean;
      enableCertificates: boolean;
      enableCapstone?: boolean;
    };
    gateways?: {
      stripe: boolean;
      razorpay: boolean;
      paypal: boolean;
    };
    restrictions?: {
      maxUsers: number;
      maxCourses: number;
      allowSelfSignup: boolean;
    };
  } | null;
}

export type SuperAdminMainTab = "academies" | "permissions" | "health" | "analytics";

export interface PermissionMatrixData {
  roles: { id: string; name: string }[];
  permissions: { id: string; name: string; description: string | null }[];
  matrix: Record<string, Record<string, boolean>>; // roleId -> permissionName -> granted
}

interface SuperAdminState {
  // ── Tenant list ─────────────────────────────────────────────────────────────
  tenantsList: TenantRecord[];
  searchTerm: string;
  selectedTenant: TenantRecord | null;

  // ── Navigation ───────────────────────────────────────────────────────────────
  activeMainTab: SuperAdminMainTab;

  // ── Modal flags ──────────────────────────────────────────────────────────────
  showCreateForm: boolean;
  showEditForm: boolean;

  // ── Permissions matrix ───────────────────────────────────────────────────────
  matrixTenantId: string;
  permissionMatrix: PermissionMatrixData | null;
  matrixLoading: boolean;

  // ── Loading ──────────────────────────────────────────────────────────────────
  isLoading: boolean;

  // ── Actions: Tenants ─────────────────────────────────────────────────────────
  setTenantsList: (tenants: TenantRecord[]) => void;
  setSearchTerm: (term: string) => void;
  selectTenant: (tenant: TenantRecord | null) => void;
  upsertTenant: (tenant: TenantRecord) => void;

  // ── Actions: Navigation ──────────────────────────────────────────────────────
  setActiveMainTab: (tab: SuperAdminMainTab) => void;

  // ── Actions: Modals ──────────────────────────────────────────────────────────
  openCreateForm: () => void;
  closeCreateForm: () => void;
  openEditForm: (tenant: TenantRecord) => void;
  closeEditForm: () => void;

  // ── Actions: Permissions ─────────────────────────────────────────────────────
  setMatrixTenantId: (id: string) => void;
  setPermissionMatrix: (data: PermissionMatrixData | null) => void;
  setMatrixLoading: (loading: boolean) => void;
  togglePermission: (roleId: string, permissionName: string) => void;

  // ── Actions: Loading ─────────────────────────────────────────────────────────
  setIsLoading: (loading: boolean) => void;

  // ── Derived ──────────────────────────────────────────────────────────────────
  filteredTenants: () => TenantRecord[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSuperAdminStore = create<SuperAdminState>()(
  devtools(
    (set, get) => ({
      tenantsList: [],
      searchTerm: "",
      selectedTenant: null,
      activeMainTab: "academies",
      showCreateForm: false,
      showEditForm: false,
      matrixTenantId: "",
      permissionMatrix: null,
      matrixLoading: false,
      isLoading: false,

      // ── Tenants ──────────────────────────────────────────────────────────────
      setTenantsList: (tenants) =>
        set({ tenantsList: tenants }, false, "superAdmin/setTenantsList"),

      setSearchTerm: (term) =>
        set({ searchTerm: term }, false, "superAdmin/setSearchTerm"),

      selectTenant: (tenant) =>
        set({ selectedTenant: tenant }, false, "superAdmin/selectTenant"),

      upsertTenant: (tenant) =>
        set(
          (s) => {
            const idx = s.tenantsList.findIndex((t) => t.id === tenant.id);
            if (idx >= 0) {
              const updated = [...s.tenantsList];
              updated[idx] = tenant;
              return { tenantsList: updated };
            }
            return { tenantsList: [...s.tenantsList, tenant] };
          },
          false,
          "superAdmin/upsertTenant"
        ),

      // ── Navigation ───────────────────────────────────────────────────────────
      setActiveMainTab: (tab) =>
        set({ activeMainTab: tab }, false, "superAdmin/setActiveMainTab"),

      // ── Modals ───────────────────────────────────────────────────────────────
      openCreateForm: () =>
        set({ showCreateForm: true }, false, "superAdmin/openCreateForm"),

      closeCreateForm: () =>
        set({ showCreateForm: false }, false, "superAdmin/closeCreateForm"),

      openEditForm: (tenant) =>
        set(
          { showEditForm: true, selectedTenant: tenant },
          false,
          "superAdmin/openEditForm"
        ),

      closeEditForm: () =>
        set({ showEditForm: false }, false, "superAdmin/closeEditForm"),

      // ── Permissions ──────────────────────────────────────────────────────────
      setMatrixTenantId: (id) =>
        set({ matrixTenantId: id }, false, "superAdmin/setMatrixTenantId"),

      setPermissionMatrix: (data) =>
        set({ permissionMatrix: data }, false, "superAdmin/setPermissionMatrix"),

      setMatrixLoading: (loading) =>
        set({ matrixLoading: loading }, false, "superAdmin/setMatrixLoading"),

      togglePermission: (roleId, permissionName) =>
        set(
          (s) => {
            if (!s.permissionMatrix) return {};
            const current = s.permissionMatrix.matrix[roleId]?.[permissionName] ?? false;
            return {
              permissionMatrix: {
                ...s.permissionMatrix,
                matrix: {
                  ...s.permissionMatrix.matrix,
                  [roleId]: {
                    ...s.permissionMatrix.matrix[roleId],
                    [permissionName]: !current,
                  },
                },
              },
            };
          },
          false,
          "superAdmin/togglePermission"
        ),

      // ── Loading ──────────────────────────────────────────────────────────────
      setIsLoading: (loading) =>
        set({ isLoading: loading }, false, "superAdmin/setIsLoading"),

      // ── Derived ──────────────────────────────────────────────────────────────
      filteredTenants: () => {
        const { tenantsList, searchTerm } = get();
        if (!searchTerm.trim()) return tenantsList;
        const q = searchTerm.toLowerCase();
        return tenantsList.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.subdomain.toLowerCase().includes(q)
        );
      },
    }),
    { name: "SuperAdminStore" }
  )
);
