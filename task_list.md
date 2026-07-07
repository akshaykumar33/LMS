# Multi-Tenant LMS Development & QA Roadmap

This document serves as the implementation and QA roadmap for the development team. It outlines five critical tracks to achieve a premium, flexible, and robust multi-tenant LMS system.

---

## 🛠️ Track 1: Roles Verification, Real-Time Sync, and QA Audit
**Objective:** Verify access control security across all platform entry points and implement real-time CRUD updates across all core modules.

### 1. Roles & Permissions Audit Checklist
*   [x] **Server Actions Guarding:** Check that all file-based server actions under `src/features/*/actions/` implement role verification.
    *   **Files to Audit:**
        *   [`admission-actions.ts`](file:///a:/LMS/src/features/admission/actions/admission-actions.ts)
        *   [`course-actions.ts`](file:///a:/LMS/src/features/course/actions/course-actions.ts)
        *   [`faculty-actions.ts`](file:///a:/LMS/src/features/faculty/actions/faculty-actions.ts)
        *   [`library-actions.ts`](file:///a:/LMS/src/features/library/actions/library-actions.ts)
        *   [`career-actions.ts`](file:///a:/LMS/src/features/career/actions/career-actions.ts)
        *   [`notification-actions.ts`](file:///a:/LMS/src/features/notification/actions/notification-actions.ts)
    *   **Action Required:** Ensure actions verify the caller's role using `requireAuth(["Admin", "Owner", ...])` and enforce read-only status for Guests using `verifyWriteAccess(user)`.
*   [x] **Page Route Guards:** Verify that page-level authorization redirects users to the correct workspace or login page.
    *   **Pages to Audit:**
        *   `src/app/admin/*` must require `["Owner", "Admin", "Program Manager"]`
        *   `src/app/faculty/*` must require `["Faculty", "Mentor"]`
        *   `src/app/super-admin/*` must require `["SuperAdmin"]`
        *   `src/app/dashboard/page.tsx` must correctly resolve and redirect roles to their respective dashboards.
*   [x] **Dynamic UI Content Visibility:**
    *   Hide/disable action buttons (e.g., "Add Course", "Approve Application") if the logged-in user does not possess the corresponding permissions or if they are in "Guest" mode.
    
### 2. Real-Time Sync & Caching Revalidation
*   [x] **Server Action Revalidation:** Ensure that every CRUD mutation calls `revalidatePath` or `revalidateTag` for the target route to update server-rendered layouts instantly.
*   [x] **Real-Time Client Notifications:**
    *   Implement Server-Sent Events (SSE) or client-side polling in [`notification-actions.ts`](file:///a:/LMS/src/features/notification/actions/notification-actions.ts) to push new notifications to users instantly without refreshing.
*   [x] **Admissions Live Pipeline:**
    *   Verify that when an admin approves an admission application, the student’s profile is instantly created in the `users` and `students` tables, and the UI status reflects "approved" or "paid" in real-time.

---

## 🎨 Track 2: UI/UX Redesign & Premium Themes
**Objective:** Upgrade core interfaces to meet premium design aesthetics (glassmorphism, vibrant HSL gradients, Outfit/Inter typography, and smooth micro-animations).

### 1. Payment & Checkout Portal (`CheckoutConsole.tsx`)
*   [x] **Visual Layout Redesign:**
    *   Incorporate a sleek dark/light card system with a blurred backdrop (`backdrop-blur-md`).
    *   Upgrade the "Order Summary" sidebar to look like a premium digital receipt.
*   [x] **Interactive Gateways:**
    *   **Stripe Card:** Animate card brand icons (Visa/Mastercard) on typing. Add input validation states (red/green borders).
    *   **Razorpay UPI:** Add an active laser scanning animation on the QR Code.
    *   **PayPal:** Improve the login authorization interface with step-by-step loading status indicators.
*   [x] **State Transitions:**
    *   Use smooth spring transitions for full-screen loading steps.
    *   Add confetti animations (using `canvas-confetti`) upon successful sandbox payment confirmation.

### 2. Login, Signup, and Sign In Portals
*   [x] **Login Revamp (`LoginForm.tsx`):**
    *   Improve the login panel style with a subtle glowing border (`sexy-border-glow`).
    *   Reorganize the "Demo Quick Access" buttons with distinct hover cards.
*   [x] **Interactive Signup (`SignupForm.tsx`):**
    *   Create a progressive wizard form with tab-switching animation.
    *   Include password strength indicators and validation checks.
*   [x] **Sandbox Developer Console:**
    *   Polish the floating Dev Console overlay with a terminal-like interface, supporting quick credentials switching, role summaries, and instant email copy helpers.

### 3. Main Landing Domain Hub (`src/app/page.tsx`)
*   [x] **Multi-Tenant Hub Page:**
    *   Upgrade the landing page header and portal selection cards.
    *   Display each tenant's custom logo, primary color highlights, and quick info badges (e.g., "5 Labs", "Active Cohort").
*   [x] **Tenant Quick Switcher:**
    *   Implement a persistent, floating "Switch Tenant" widget (or sidebar dropdown) visible to administrators, allowing them to jump from `intel` to `amd` or `tsmc` subdomains instantly.
    *   Support URL query params (`/?tenant=amd`) and subdomain routing contexts dynamically.

---

## 🏢 Track 3: Hierarchical Tenancy Model (Parent-Subtenant)
**Objective:** Allow parent organizations (e.g., Virginia Tech CoE) to host nested sub-tenants (e.g., Intel Academy, AMD Center) while maintaining data isolation and global visibility.

### 1. Database Schema Changes (`schema.ts`)
*   [x] **Update Tenants Table:**
    *   Add a self-referencing `parentTenantId` column:
      ```typescript
      parentTenantId: uuid("parent_tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      ```
*   [x] **Relationships Definition:**
    *   Add a parent-child relation inside `tenantsRelations`:
      ```typescript
      parent: one(tenants, { fields: [tenants.parentTenantId], references: [tenants.id], relationName: "sub_tenants" }),
      children: many(tenants, { relationName: "sub_tenants" }),
      ```

### 2. Multi-Tenant Routing & Middleware (`middleware.ts`)
*   [x] **Sub-Tenant Subdomains:**
    *   Support nested subdomains or routing formats (e.g., `austin.intel.localhost:3000` or `/tenant/intel/sub/austin`).
    *   Ensure middleware accurately resolves the sub-tenant context header `x-tenant-subdomain` and matches parent permissions.

### 3. Hierarchical Data Isolation & Aggregation Queries
*   [x] **Scoped Data Fetching:**
    *   Standard queries must retrieve records for the current tenant (`tenantId = currentTenantId`).
    *   If the logged-in user is a Parent Owner/Admin, queries must allow aggregation:
      ```typescript
      // Fetching courses or students under parent or any of its sub-tenants
      where: or(
        eq(students.tenantId, currentTenantId),
        inArray(students.tenantId, subTenantIdsList)
      )
      ```
*   [x] **Seed Script Updates (`seed.ts`):**
    *   Modify the seed file to set Virginia Tech as the parent tenant, with Intel, AMD, and TSMC designated as its sub-tenants.

---

## 🎛️ Track 4: Super Admin Control & Flexibility Center
**Objective:** Build a settings center within the Super Admin Console to configure tenants, toggle features, manage permissions, and override restrictions in real-time.

### 1. Tenant Features Config Schema
*   [x] **Flexible JSON Settings:**
    *   Add a `settings` JSONB column to the `tenants` table to hold configurable feature toggles and restrictions:
      ```typescript
      settings: jsonb("settings").$type<{
        features: {
          enableLibrary: boolean;
          enablePlacement: boolean;
          enableProctoring: boolean;
          enableCertificates: boolean;
        };
        gateways: {
          stripe: boolean;
          razorpay: boolean;
          paypal: boolean;
        };
        restrictions: {
          maxUsers: number;
          maxCourses: number;
          allowSelfSignup: boolean;
        };
      }>(),
      ```

### 2. Real-Time Admin Config Control UI (`SuperAdminConsole.tsx`)
*   [x] **Feature Configuration Interface:**
    *   Create a "Features & Gateways" settings tab inside the tenant edit modal.
    *   Implement switch toggles for each module (Library, Placement, Proctoring) and gateway (Stripe, Razorpay, PayPal) that save and update the database instantly.
*   [x] **Branding Customizer:**
    *   Provide live preview swatches for primary and secondary theme colors, logos, and custom domains. Updates must reflect instantly across the tenant’s portal page.
*   [x] **Platform Role Permission Editor:**
    *   Build a global Permission Matrix grid (Roles vs. Permissions) allowing super-admins to check/uncheck access permissions (e.g., `admission:approve`, `courses:write`) and update role-permission maps in real-time.

---

## 🧪 Track 5: Website QA, Verification & Performance Audit
**Objective:** Perform comprehensive validation to ensure code correctness, cross-tenant data safety, and high performance.

### 1. QA Verification Checklist
*   [x] **Access Control Verification:**
    *   Attempt unauthorized edits in "Guest" mode to verify that `verifyWriteAccess` blocks mutations and displays alerts.
    *   Ensure non-SuperAdmin users cannot access `/super-admin` page or trigger tenant creation/update actions.
*   [x] **Tenant Isolation Check:**
    *   Verify that logged-in students or staff of `intel` cannot view courses, batches, or job listings of `amd` or `tsmc`.
*   [x] **Sub-Tenant Hierarchy Check:**
    *   Confirm that parent admin users can see sub-tenant records while sub-tenant users remain restricted to their own sub-tenant data.
*   [x] **Theme Color Normalization:**
    *   Test color schemes like TSMC (black primary theme color). Verify that contrast ratios are computed to prevent rendering black text on dark background surfaces.

### 2. Performance & Error Audit
*   [x] **Drizzle Queries optimization:** Check for N+1 query patterns during tenant page loads (e.g., batch lists, lesson progress) and utilize Drizzle relations join queries where possible.
*   [x] **Next.js Linting:** Run `npm run lint` and verify that no deprecated Next.js APIs or unresolved ESLint errors are present.
