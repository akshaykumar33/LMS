/**
 * @file super-admin-form-store.ts
 * @description Zustand store for the SuperAdmin console's dense form state.
 *
 * Moves the ~30 useState calls from SuperAdminConsole.tsx into a single,
 * devtools-inspectable store, grouped by concern:
 *   - Create-tenant form fields
 *   - Edit-tenant form fields (branding, features, gateways, restrictions, AI)
 *   - Modal tab navigation
 *   - View mode (table / tree)
 *   - Ephemeral banner messages
 *   - DB playground
 *   - Billing simulator
 *   - togglingMatrix (which matrix cell is mid-flight)
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type ModalTab = "branding" | "features" | "ai";
export type ViewMode = "table" | "tree";

// ─── State shape ─────────────────────────────────────────────────────────────

interface SuperAdminFormState {
  // ── Create form ──────────────────────────────────────────────────────────────
  createName: string;
  createSubdomain: string;
  createCustomDomain: string;
  createLogoUrl: string;
  createPrimaryColor: string;
  createSecondaryColor: string;
  createParentTenantId: string;
  createDbName: string;
  createDbUrl: string;

  // ── Edit form — branding ──────────────────────────────────────────────────────
  editName: string;
  editSubdomain: string;
  editCustomDomain: string;
  editLogoUrl: string;
  editPrimaryColor: string;
  editSecondaryColor: string;
  editStatus: string;
  editParentTenantId: string;
  editDbName: string;
  editDbUrl: string;

  // ── Edit form — features ──────────────────────────────────────────────────────
  enableLibrary: boolean;
  enablePlacement: boolean;
  enableProctoring: boolean;
  enableCertificates: boolean;
  enableCapstone: boolean;

  // ── Edit form — gateways ──────────────────────────────────────────────────────
  stripe: boolean;
  razorpay: boolean;
  paypal: boolean;

  // ── Edit form — restrictions ──────────────────────────────────────────────────
  maxUsers: number;
  maxCourses: number;
  allowSelfSignup: boolean;

  // ── Edit form — AI ───────────────────────────────────────────────────────────
  enableAi: boolean;
  aiProvider: string;
  aiApiKey: string;
  aiModel: string;

  // ── Modal state ───────────────────────────────────────────────────────────────
  activeModalTab: ModalTab;
  viewMode: ViewMode;

  // ── Ephemeral banners ─────────────────────────────────────────────────────────
  errorMsg: string | null;
  successMsg: string | null;
  togglingMatrix: string | null;

  // ── DB Playground ─────────────────────────────────────────────────────────────
  playgroundQuery: string;
  playgroundRunning: boolean;
  playgroundResults: any[] | null;
  playgroundTime: number;

  // ── Billing simulator ─────────────────────────────────────────────────────────
  isCheckoutOpen: boolean;
  checkoutRunning: boolean;
  checkoutSuccess: boolean;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;

  // ── Actions: create form ──────────────────────────────────────────────────────
  setCreateName: (v: string) => void;
  setCreateSubdomain: (v: string) => void;
  setCreateCustomDomain: (v: string) => void;
  setCreateLogoUrl: (v: string) => void;
  setCreatePrimaryColor: (v: string) => void;
  setCreateSecondaryColor: (v: string) => void;
  setCreateParentTenantId: (v: string) => void;
  setCreateDbName: (v: string) => void;
  setCreateDbUrl: (v: string) => void;
  resetCreateForm: () => void;

  // ── Actions: edit form — branding ─────────────────────────────────────────────
  setEditName: (v: string) => void;
  setEditSubdomain: (v: string) => void;
  setEditCustomDomain: (v: string) => void;
  setEditLogoUrl: (v: string) => void;
  setEditPrimaryColor: (v: string) => void;
  setEditSecondaryColor: (v: string) => void;
  setEditStatus: (v: string) => void;
  setEditParentTenantId: (v: string) => void;
  setEditDbName: (v: string) => void;
  setEditDbUrl: (v: string) => void;

  // ── Actions: edit form — features ─────────────────────────────────────────────
  setEnableLibrary: (v: boolean) => void;
  setEnablePlacement: (v: boolean) => void;
  setEnableProctoring: (v: boolean) => void;
  setEnableCertificates: (v: boolean) => void;
  setEnableCapstone: (v: boolean) => void;

  // ── Actions: edit form — gateways ─────────────────────────────────────────────
  setStripe: (v: boolean) => void;
  setRazorpay: (v: boolean) => void;
  setPaypal: (v: boolean) => void;

  // ── Actions: edit form — restrictions ────────────────────────────────────────
  setMaxUsers: (v: number) => void;
  setMaxCourses: (v: number) => void;
  setAllowSelfSignup: (v: boolean) => void;

  // ── Actions: edit form — AI ───────────────────────────────────────────────────
  setEnableAi: (v: boolean) => void;
  setAiProvider: (v: string) => void;
  setAiApiKey: (v: string) => void;
  setAiModel: (v: string) => void;

  /**
   * Bulk-populate all edit form fields from a tenant object.
   * Call this when opening the edit modal to avoid many individual setters.
   */
  populateEditForm: (tenant: {
    name: string;
    subdomain: string;
    customDomain?: string | null;
    branding?: { logoUrl?: string; primaryColor?: string; secondaryColor?: string } | null;
    status: string;
    parentTenantId?: string | null;
    dbName?: string | null;
    settings?: any;
  }) => void;

  // ── Actions: modals / view ────────────────────────────────────────────────────
  setActiveModalTab: (tab: ModalTab) => void;
  setViewMode: (mode: ViewMode) => void;

  // ── Actions: banners ──────────────────────────────────────────────────────────
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  setTogglingMatrix: (key: string | null) => void;
  clearBanners: () => void;

  // ── Actions: DB Playground ────────────────────────────────────────────────────
  setPlaygroundQuery: (q: string) => void;
  setPlaygroundRunning: (v: boolean) => void;
  setPlaygroundResults: (rows: any[] | null) => void;
  setPlaygroundTime: (ms: number) => void;

  // ── Actions: Billing simulator ────────────────────────────────────────────────
  openCheckout: () => void;
  closeCheckout: () => void;
  setCheckoutRunning: (v: boolean) => void;
  setCheckoutSuccess: (v: boolean) => void;
  setCardNumber: (v: string) => void;
  setCardExpiry: (v: string) => void;
  setCardCvc: (v: string) => void;
  resetCheckout: () => void;
}

// ─── Initial values ───────────────────────────────────────────────────────────

const CREATE_DEFAULTS = {
  createName: "",
  createSubdomain: "",
  createCustomDomain: "",
  createLogoUrl: "",
  createPrimaryColor: "#0ea5e9",
  createSecondaryColor: "#0f172a",
  createParentTenantId: "",
  createDbName: "",
  createDbUrl: "",
};

const EDIT_DEFAULTS = {
  editName: "",
  editSubdomain: "",
  editCustomDomain: "",
  editLogoUrl: "",
  editPrimaryColor: "#0ea5e9",
  editSecondaryColor: "#0f172a",
  editStatus: "active",
  editParentTenantId: "",
  editDbName: "",
  editDbUrl: "",
  enableLibrary: true,
  enablePlacement: true,
  enableProctoring: true,
  enableCertificates: true,
  enableCapstone: true,
  stripe: true,
  razorpay: true,
  paypal: true,
  maxUsers: 200,
  maxCourses: 50,
  allowSelfSignup: true,
  enableAi: true,
  aiProvider: "mock",
  aiApiKey: "",
  aiModel: "gpt-4o-mini",
};

const CHECKOUT_DEFAULTS = {
  isCheckoutOpen: false,
  checkoutRunning: false,
  checkoutSuccess: false,
  cardNumber: "4242 4242 4242 4242",
  cardExpiry: "12/29",
  cardCvc: "123",
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSuperAdminFormStore = create<SuperAdminFormState>()(
  devtools(
    (set) => ({
      ...CREATE_DEFAULTS,
      ...EDIT_DEFAULTS,
      ...CHECKOUT_DEFAULTS,

      activeModalTab: "branding",
      viewMode: "table",
      errorMsg: null,
      successMsg: null,
      togglingMatrix: null,
      playgroundQuery: "SELECT * FROM public.tenants LIMIT 5;",
      playgroundRunning: false,
      playgroundResults: null,
      playgroundTime: 0,

      // ── Create form ────────────────────────────────────────────────────────
      setCreateName: (v) => set({ createName: v }, false, "saForm/setCreateName"),
      setCreateSubdomain: (v) => set({ createSubdomain: v }, false, "saForm/setCreateSubdomain"),
      setCreateCustomDomain: (v) => set({ createCustomDomain: v }, false, "saForm/setCreateCustomDomain"),
      setCreateLogoUrl: (v) => set({ createLogoUrl: v }, false, "saForm/setCreateLogoUrl"),
      setCreatePrimaryColor: (v) => set({ createPrimaryColor: v }, false, "saForm/setCreatePrimaryColor"),
      setCreateSecondaryColor: (v) => set({ createSecondaryColor: v }, false, "saForm/setCreateSecondaryColor"),
      setCreateParentTenantId: (v) => set({ createParentTenantId: v }, false, "saForm/setCreateParentTenantId"),
      setCreateDbName: (v) => set({ createDbName: v }, false, "saForm/setCreateDbName"),
      setCreateDbUrl: (v) => set({ createDbUrl: v }, false, "saForm/setCreateDbUrl"),
      resetCreateForm: () => set(CREATE_DEFAULTS, false, "saForm/resetCreateForm"),

      // ── Edit form — branding ───────────────────────────────────────────────
      setEditName: (v) => set({ editName: v }, false, "saForm/setEditName"),
      setEditSubdomain: (v) => set({ editSubdomain: v }, false, "saForm/setEditSubdomain"),
      setEditCustomDomain: (v) => set({ editCustomDomain: v }, false, "saForm/setEditCustomDomain"),
      setEditLogoUrl: (v) => set({ editLogoUrl: v }, false, "saForm/setEditLogoUrl"),
      setEditPrimaryColor: (v) => set({ editPrimaryColor: v }, false, "saForm/setEditPrimaryColor"),
      setEditSecondaryColor: (v) => set({ editSecondaryColor: v }, false, "saForm/setEditSecondaryColor"),
      setEditStatus: (v) => set({ editStatus: v }, false, "saForm/setEditStatus"),
      setEditParentTenantId: (v) => set({ editParentTenantId: v }, false, "saForm/setEditParentTenantId"),
      setEditDbName: (v) => set({ editDbName: v }, false, "saForm/setEditDbName"),
      setEditDbUrl: (v) => set({ editDbUrl: v }, false, "saForm/setEditDbUrl"),

      // ── Edit form — features ───────────────────────────────────────────────
      setEnableLibrary: (v) => set({ enableLibrary: v }, false, "saForm/setEnableLibrary"),
      setEnablePlacement: (v) => set({ enablePlacement: v }, false, "saForm/setEnablePlacement"),
      setEnableProctoring: (v) => set({ enableProctoring: v }, false, "saForm/setEnableProctoring"),
      setEnableCertificates: (v) => set({ enableCertificates: v }, false, "saForm/setEnableCertificates"),
      setEnableCapstone: (v) => set({ enableCapstone: v }, false, "saForm/setEnableCapstone"),

      // ── Edit form — gateways ───────────────────────────────────────────────
      setStripe: (v) => set({ stripe: v }, false, "saForm/setStripe"),
      setRazorpay: (v) => set({ razorpay: v }, false, "saForm/setRazorpay"),
      setPaypal: (v) => set({ paypal: v }, false, "saForm/setPaypal"),

      // ── Edit form — restrictions ───────────────────────────────────────────
      setMaxUsers: (v) => set({ maxUsers: v }, false, "saForm/setMaxUsers"),
      setMaxCourses: (v) => set({ maxCourses: v }, false, "saForm/setMaxCourses"),
      setAllowSelfSignup: (v) => set({ allowSelfSignup: v }, false, "saForm/setAllowSelfSignup"),

      // ── Edit form — AI ─────────────────────────────────────────────────────
      setEnableAi: (v) => set({ enableAi: v }, false, "saForm/setEnableAi"),
      setAiProvider: (v) => set({ aiProvider: v }, false, "saForm/setAiProvider"),
      setAiApiKey: (v) => set({ aiApiKey: v }, false, "saForm/setAiApiKey"),
      setAiModel: (v) => set({ aiModel: v }, false, "saForm/setAiModel"),

      populateEditForm: (tenant) => {
        const s = (tenant.settings as any) || {};
        set(
          {
            editName: tenant.name,
            editSubdomain: tenant.subdomain,
            editCustomDomain: tenant.customDomain || "",
            editLogoUrl: tenant.branding?.logoUrl || "",
            editPrimaryColor: tenant.branding?.primaryColor || "#0ea5e9",
            editSecondaryColor: tenant.branding?.secondaryColor || "#0f172a",
            editStatus: tenant.status,
            editParentTenantId: tenant.parentTenantId || "",
            editDbName: tenant.dbName || "",
            editDbUrl: s.database?.dbUrl || "",
            enableLibrary: s.features?.enableLibrary ?? true,
            enablePlacement: s.features?.enablePlacement ?? true,
            enableProctoring: s.features?.enableProctoring ?? true,
            enableCertificates: s.features?.enableCertificates ?? true,
            enableCapstone: s.features?.enableCapstone ?? true,
            stripe: s.gateways?.stripe ?? true,
            razorpay: s.gateways?.razorpay ?? true,
            paypal: s.gateways?.paypal ?? true,
            maxUsers: s.restrictions?.maxUsers ?? 200,
            maxCourses: s.restrictions?.maxCourses ?? 50,
            allowSelfSignup: s.restrictions?.allowSelfSignup ?? true,
            enableAi: s.ai?.enableAi ?? true,
            aiProvider: s.ai?.provider ?? "mock",
            aiApiKey: s.ai?.apiKey ?? "",
            aiModel: s.ai?.model ?? "gpt-4o-mini",
            activeModalTab: "branding",
          },
          false,
          "saForm/populateEditForm"
        );
      },

      // ── Modals / view ──────────────────────────────────────────────────────
      setActiveModalTab: (tab) => set({ activeModalTab: tab }, false, "saForm/setActiveModalTab"),
      setViewMode: (mode) => set({ viewMode: mode }, false, "saForm/setViewMode"),

      // ── Banners ────────────────────────────────────────────────────────────
      setErrorMsg: (msg) => set({ errorMsg: msg }, false, "saForm/setErrorMsg"),
      setSuccessMsg: (msg) => set({ successMsg: msg }, false, "saForm/setSuccessMsg"),
      setTogglingMatrix: (key) => set({ togglingMatrix: key }, false, "saForm/setTogglingMatrix"),
      clearBanners: () => set({ errorMsg: null, successMsg: null }, false, "saForm/clearBanners"),

      // ── DB Playground ──────────────────────────────────────────────────────
      setPlaygroundQuery: (q) => set({ playgroundQuery: q }, false, "saForm/setPlaygroundQuery"),
      setPlaygroundRunning: (v) => set({ playgroundRunning: v }, false, "saForm/setPlaygroundRunning"),
      setPlaygroundResults: (rows) => set({ playgroundResults: rows }, false, "saForm/setPlaygroundResults"),
      setPlaygroundTime: (ms) => set({ playgroundTime: ms }, false, "saForm/setPlaygroundTime"),

      // ── Billing simulator ──────────────────────────────────────────────────
      openCheckout: () => set({ isCheckoutOpen: true }, false, "saForm/openCheckout"),
      closeCheckout: () => set({ isCheckoutOpen: false }, false, "saForm/closeCheckout"),
      setCheckoutRunning: (v) => set({ checkoutRunning: v }, false, "saForm/setCheckoutRunning"),
      setCheckoutSuccess: (v) => set({ checkoutSuccess: v }, false, "saForm/setCheckoutSuccess"),
      setCardNumber: (v) => set({ cardNumber: v }, false, "saForm/setCardNumber"),
      setCardExpiry: (v) => set({ cardExpiry: v }, false, "saForm/setCardExpiry"),
      setCardCvc: (v) => set({ cardCvc: v }, false, "saForm/setCardCvc"),
      resetCheckout: () => set(CHECKOUT_DEFAULTS, false, "saForm/resetCheckout"),
    }),
    { name: "SuperAdminFormStore" }
  )
);
