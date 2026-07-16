# Wysbryx LMS — Multi-Tenant Learning Management Platform

> **Production-grade**, multi-tenant LMS built for semiconductor education.  
> Powered by **Next.js 16 App Router**, **React 19**, **PostgreSQL / Drizzle ORM**,  
> **Zustand** state management, and subdomain-based tenant isolation.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Tech Stack](#4-tech-stack)
5. [Module-wise Explanation](#5-module-wise-explanation)
6. [Complete Application Flow](#6-complete-application-flow)
7. [State Management Flow (Zustand)](#7-state-management-flow-zustand)
8. [Data Flow](#8-data-flow)
9. [Routing Structure](#9-routing-structure)
10. [API Integration Flow](#10-api-integration-flow)
11. [Setup & Installation](#11-setup--installation)
12. [Environment Variables](#12-environment-variables)
13. [Build & Deployment](#13-build--deployment)
14. [Coding Conventions](#14-coding-conventions)
15. [Future Improvements](#15-future-improvements)

---

## 1. Project Overview

Wysbryx is a **white-label, multi-tenant Learning Management System** purpose-built
for the semiconductor and deep-tech education sector.  Each customer organisation
(e.g. VT Institute, Nvidia Academy) gets its own **subdomain**, branded portal, and
**fully isolated PostgreSQL schema**.  Organisations can further create child
sub-tenants (e.g. Intel Academy inside VT Institute) forming a 3-level hierarchy.

### Key capabilities

| Capability | Description |
|---|---|
| Multi-tenancy | Subdomain routing + per-tenant PostgreSQL schema isolation |
| Auth & RBAC | JWT HttpOnly cookies, 9 system roles, custom role + permission matrix |
| Admissions | Multi-step application → document upload → Stripe/Razorpay payment → approval |
| Courses & LMS | Courses → Modules → Lessons (video, PDF, SCORM, live Zoom classes) |
| Quiz Engine | MCQ quizzes with AI-proctoring, infraction counting, video audit log |
| Certificates | PDF certificates with QR-code public verification page |
| Placement | Job board, student applications, placement officer dashboard |
| Digital Library | Tenant-scoped resource library (PDF, video, audio) |
| Notifications | Real-time SSE push notifications + in-app bell |
| Analytics | Revenue, enrolment, quiz performance dashboards (Recharts) |
| Capstone | Project submission and evaluation workflow |
| Guest Sandbox | Read-only view for unauthenticated visitors |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  ┌──────────────────┐   subdomain / cookie / query-param        │
│  │  vt.domain.com   │──────────────────────────────────────┐    │
│  │  nvidia.domain   │                                      │    │
│  └──────────────────┘                                      ▼    │
└─────────────────────────────────────────────────────────────────┘
                                                ┌────────────────────┐
                                                │  Next.js Middleware │
                                                │  (src/proxy.ts)    │
                                                │  • Parse subdomain │
                                                │  • Set header      │
                                                │  • Auth guard      │
                                                └────────┬───────────┘
                                                         │
                          ┌──────────────────────────────▼───────────────────────┐
                          │  Next.js App Router (Server Components + Actions)    │
                          │                                                       │
                          │  ┌────────────────┐   ┌──────────────────────────┐  │
                          │  │  Server         │   │  Server Actions          │  │
                          │  │  Components     │   │  (mutations / auth)      │  │
                          │  │  (data fetch)   │   └──────────────────────────┘  │
                          │  └────────┬────────┘                                 │
                          │           │ props / serialised data                  │
                          │  ┌────────▼────────────────────────────────────────┐ │
                          │  │  Client Components  ←── Zustand Stores          │ │
                          │  │  (DashboardLayout, Forms, Charts …)             │ │
                          │  └─────────────────────────────────────────────────┘ │
                          └──────────────────────┬────────────────────────────────┘
                                                 │
                          ┌──────────────────────▼─────────────────────────────────┐
                          │  Database Layer (Drizzle ORM)                          │
                          │                                                         │
                          │  AsyncLocalStorage subdomain context                    │
                          │       ↓                                                 │
                          │  SET LOCAL search_path = tenant_{subdomain}             │
                          │       ↓                                                 │
                          │  Per-tenant PostgreSQL schema                           │
                          └────────────────────────────────────────────────────────┘
```

### Multi-Tenancy Model

```
Wysbryx Root (wysbryx.domain.com)
  └─ VT Institute  (vt.domain.com)          ← Org tenant
       ├─ Intel Academy (intel.vt.domain)   ← Sub-tenant
       ├─ AMD Academy   (amd.vt.domain)
       └─ TSMC Academy  (tsmc.vt.domain)
  └─ Nvidia  (nvidia.domain.com)
       └─ Nvidia Deep Learning (ndl.nvidia.domain)
```

Each tenant has its own PostgreSQL schema (`tenant_vt`, `tenant_intel` …).  
All tables are replicated per schema; the `db.ts` proxy routes queries via
`AsyncLocalStorage` + `SET LOCAL search_path` with zero application-code changes.

---

## 3. Folder Structure

```
LMS/
├── public/                       # Static assets
├── src/
│   ├── app/                      # Next.js App Router pages & API routes
│   │   ├── layout.tsx            # Root Server Layout (metadata, CSS variables, theme)
│   │   ├── page.tsx              # Root page (SuperAdmin hub / org hub / landing)
│   │   ├── (auth pages)/         # login, signup, forgot-password
│   │   ├── dashboard/            # Student/staff dashboard
│   │   ├── courses/[courseId]/   # Course viewer
│   │   ├── admission/apply/      # Public admissions form
│   │   ├── checkout/             # Stripe/Razorpay checkout
│   │   ├── progress/             # Student progress tracker
│   │   ├── library/              # Digital library
│   │   ├── career/               # Job board
│   │   ├── faculty/              # Faculty portal
│   │   ├── profile/              # User profile
│   │   ├── admin/                # Admin console (admissions, courses, analytics, placement)
│   │   ├── super-admin/          # SuperAdmin control centre
│   │   ├── verify/[certificateId]/ # Public certificate verification
│   │   └── api/
│   │       ├── notifications/stream/   # SSE push endpoint
│   │       ├── download/               # Signed S3 download proxy
│   │       ├── mock-upload/            # Dev mock upload endpoint
│   │       └── webhooks/
│   │           ├── stripe/[tenantId]/  # Stripe payment webhook
│   │           └── zoom/               # Zoom meeting webhook
│   │
│   ├── components/               # Shared shell components
│   │   ├── DashboardLayout.tsx   # Main app shell (sidebar, nav, header)
│   │   ├── StudentLayout.tsx     # Student-specific layout wrapper
│   │   ├── BrandLogo.tsx         # Tenant-aware logo
│   │   ├── CommandPalette.tsx    # Ctrl+K command palette
│   │   ├── ThemeSwitcher.tsx     # Dark/light/system toggle
│   │   ├── TenantQuickSwitcher.tsx
│   │   ├── GatewayUserControls.tsx
│   │   ├── GuestSandboxBanner.tsx
│   │   ├── OrganizationHubExplorer.tsx
│   │   └── ui/                   # shadcn/ui primitives (button, card, dialog …)
│   │
│   ├── features/                 # Domain modules (vertical slices)
│   │   ├── admin/                # Admin actions (bulk ops, seeding, etc.)
│   │   ├── admission/            # Application flow: actions, components, repo, schemas, services
│   │   ├── analytics/            # Analytics: actions, components, repo, services
│   │   ├── auth/                 # JWT auth: actions, components, data, services
│   │   ├── career/               # Job board: actions, components, repo
│   │   ├── course/               # LMS: actions, components, repo, services
│   │   ├── dashboard/            # Dashboard widgets: components
│   │   ├── faculty/              # Faculty portal: actions, components, repo
│   │   ├── library/              # Digital library: actions, components
│   │   ├── notification/         # Notifications: actions, components, repo, services
│   │   ├── profile/              # Profile management: components
│   │   └── quiz/                 # Quiz engine: actions, components, repo
│   │
│   ├── store/                    # ★ Zustand global state stores
│   │   ├── auth-store.ts         # Authenticated user snapshot
│   │   ├── tenant-store.ts       # Active tenant context + feature flags
│   │   ├── ui-store.ts           # Sidebar, theme, command palette, toasts
│   │   ├── gamification-store.ts # Student XP, level, streak, badges (persisted)
│   │   ├── notification-store.ts # In-app notification list + SSE state
│   │   ├── hydrators.tsx         # Client hydrator components for server data
│   │   └── index.ts              # Barrel export
│   │
│   ├── db/
│   │   ├── db.ts                 # Drizzle client + AsyncLocalStorage proxy
│   │   ├── schema.ts             # Complete 27-table Drizzle schema
│   │   └── migrations/           # Drizzle Kit SQL migrations
│   │
│   ├── lib/
│   │   └── utils.ts              # cn() and other utility functions
│   │
│   ├── utils/
│   │   ├── date-formatter.ts
│   │   └── tenant-formatter.ts
│   │
│   └── proxy.ts                  # Next.js middleware logic (subdomain detection, auth guard)
│
├── .env                          # Local secrets (gitignored)
├── .env.example                  # Template for environment variables
├── drizzle.config.ts             # Drizzle Kit configuration
├── next.config.ts                # Next.js configuration
├── docker-compose.yml            # Local Postgres + services
└── Dockerfile                    # Production container
```

---

## 4. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.2.9 | App Router, Server Components, Server Actions |
| UI Runtime | React | 19.2.4 | Component model |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Components | shadcn/ui + Radix UI | latest | Accessible headless primitives |
| State | Zustand | 5.0.14 | Global client state management |
| Forms | react-hook-form + Zod | 7.x / 4.x | Schema-validated forms |
| ORM | Drizzle ORM | 0.45.x | Type-safe PostgreSQL queries |
| Database | PostgreSQL | 15+ | Per-tenant schema isolation |
| Auth | Custom JWT | — | HttpOnly cookies, 15 min access + 7 day refresh |
| Payments | Stripe | 22.x | Admission fee checkout + webhooks |
| Storage | AWS S3 | 3.x | Document / media uploads |
| Video | Zoom SDK | — | Live class scheduling + webhooks |
| Charts | Recharts | 3.x | Analytics dashboards |
| PDF | pdf-lib | 1.x | Certificate generation |
| Tables | TanStack Table | 8.x | Data grids |
| Email | Nodemailer | 9.x | Transactional emails |
| Icons | Lucide React | 1.x | Icon set |
| Containerisation | Docker | — | Reproducible local + production env |

---

## 5. Module-wise Explanation

Each feature under `src/features/<name>/` follows a vertical-slice pattern:

```
features/<name>/
  actions/      ← "use server" Server Actions (mutations, form handlers)
  components/   ← React client/server components scoped to this feature
  repository/   ← Raw DB queries (Drizzle) — no business logic
  services/     ← Business logic that orchestrates repository calls
  schemas/      ← Zod validation schemas for forms & API payloads
```

### `auth`
JWT-based authentication.  
- `services/jwt.ts` — `signAccessToken`, `signRefreshToken`, `verifyAccessToken`  
- `services/session.ts` — `getCurrentUser`, `requireAuth`, `hasPermission`, `requirePermission`  
- `services/tenant.ts` — `getTenantContext`, `getScopedTenantIds` (BFS hierarchy walk)  
- `actions/auth-actions.ts` — `loginAction`, `logoutAction`, `refreshSessionAction`  
- `components/` — Login form, SignUp wizard, ForgotPassword  

### `admission`
Full student admission lifecycle.  
- Multi-step form: personal info → academic history → document upload → payment  
- Status flow: `pending → under_review → payment_pending → approved / rejected`  
- Integrates with Stripe webhook (`/api/webhooks/stripe/[tenantId]`) to auto-approve on payment  

### `course`
Core LMS content hierarchy: **Course → Module → Lesson**.  
- Lesson types: `text`, `video`, `pdf`, `scorm`, `live_class` (Zoom)  
- SCORM package upload and playback support  
- Repository pattern for all DB queries  

### `quiz`
MCQ quiz engine with optional AI proctoring.  
- Tab-switch and focus-loss infraction counting  
- Proctor video log URL stored per attempt  
- Auto-flag attempts with `infractionCount > threshold` for audit  

### `analytics`
Recharts-powered dashboards for Owners and Admins.  
- Revenue metrics (Stripe payment aggregations)  
- Enrolment trends over time  
- Quiz pass/fail rates per course  

### `admin`
Admin console actions: bulk user import, batch management, course assignment,
admission approval queue, placement officer controls.

### `notification`
Real-time in-app notifications via **Server-Sent Events**.  
- SSE stream at `/api/notifications/stream`  
- `NotificationBell` component subscribes to SSE and writes to `useNotificationStore`  
- Mark-read, clear, type-coded (info / success / warning / alert)  

### `career`
Placement and job board module.  
- Job postings (CRUD for Placement Officers)  
- Student job applications with resume upload  
- Application status: `applied → interviewing → offered / rejected`  

### `library`
Tenant-scoped digital resource library.  
- Supports PDF, video, audio media  
- Signed S3 download URLs via `/api/download`  

### `faculty`
Faculty portal.  
- View assigned batches and courses  
- Upload lesson materials  
- Grade quiz attempts  

### `profile`
User profile management — edit display name, avatar, change password.

### `dashboard`
Role-aware dashboard widgets:  
- Students: progress bar, streak, upcoming classes, recent grades  
- Admins/Owners: enrolment summary, revenue, pending admissions  

---

## 6. Complete Application Flow

### 6.1 First Visit — Tenant Resolution

```
User visits vt.domain.com
    │
    ▼
src/proxy.ts (Next.js Middleware)
    │  Parse subdomain from: host header → query param → cookie
    │  Set x-tenant-subdomain header on the request
    │  Check access_token cookie → redirect to /login if absent
    ▼
Root Layout (app/layout.tsx) — Server Component
    │  getTenantContext() reads x-tenant-subdomain header
    │  Fetches tenant row + branding from DB
    │  Generates CSS variables (--primary, --background …)
    │  Renders <AuthHydrator> and <TenantHydrator> client leaves
    ▼
Page Component — Server Component
    │  getCurrentUser() reads & verifies JWT
    │  Fetches page-specific data
    │  Passes serialised props to Client Components
    ▼
Client Shell (DashboardLayout)
    │  Reads useAuthStore, useTenantStore, useUIStore via Zustand
    │  No prop drilling — all shared state is in the stores
    ▼
Feature Component (e.g. CourseViewer, DashboardPage)
```

### 6.2 Login Flow

```
POST /login (Server Action: loginAction)
    │
    ├─ Lookup user email across all active tenant subdomains
    ├─ Verify bcrypt password hash
    ├─ Root Portal Gate: only SuperAdmin on wysbryx subdomain
    ├─ Cross-Tenant Ancestry Gate: verify user belongs to login domain
    ├─ signAccessToken (15 min JWT) + signRefreshToken (7 days)
    ├─ Set HttpOnly cookies: access_token, refresh_token, x-tenant-subdomain
    └─ redirect("/dashboard")
```

### 6.3 Admission → Enrolment Flow

```
/admission/apply  (public, no auth required)
    │  Multi-step form with Zod validation
    │  Document uploads → S3 (mock or real)
    │  Creates admissionApplications row (status: pending)
    ▼
Admin approves → status: payment_pending
    ▼
Student pays via /checkout (Stripe or Razorpay)
    ▼
/api/webhooks/stripe/[tenantId]
    │  Verifies Stripe signature
    │  Updates application status → approved
    │  Creates users + students row
    │  Sends welcome notification
    ▼
Student can now log in
```

### 6.4 Quiz with Proctoring Flow

```
Student opens quiz
    │  Proctor initialises: requestAnimationFrame loop + camera stream
    │  Tab/window blur → infractionCount++
    ├─ If infractionCount > threshold → auto-submit
    │
    ▼
Student submits answers
    │  Server Action validates answers vs correctOptionId
    │  Calculates score and passed boolean
    │  Records proctorVideoLogUrl and infractionCount
    │  If infractions > threshold → isFlaggedForAudit = true
    ▼
Faculty / Admin reviews flagged attempts
```

---

## 7. State Management Flow (Zustand)

### Store Overview

```
src/store/
├── auth-store.ts          useAuthStore
├── tenant-store.ts        useTenantStore
├── ui-store.ts            useUIStore
├── gamification-store.ts  useGamificationStore   ← persisted to localStorage
├── notification-store.ts  useNotificationStore
├── hydrators.tsx          AuthHydrator, TenantHydrator, GamificationHydrator
└── index.ts               barrel export
```

### Hydration Pattern (Server → Client)

Because Next.js Server Components cannot use React hooks, the pattern is:

```
Server Component
    │  resolves: user, tenant, gamification stats from DB/cookies
    │
    ▼  passes as props
Client Hydrator Component  (hydrators.tsx)
    │  useEffect → store.hydrate(data)
    │
    ▼
Any Client Component anywhere in the tree
    const user = useAuthStore(s => s.user);      // ✅ no prop drilling
    const color = useTenantStore(s => s.primaryColor());
    const { xp, level } = useGamificationStore();
```

### Store Responsibilities

| Store | What it holds | Persisted? |
|---|---|---|
| `useAuthStore` | User snapshot (id, role, subdomain, email) | No — rehydrated each visit |
| `useTenantStore` | Tenant branding, feature flags, settings | No — rehydrated each visit |
| `useUIStore` | Sidebar collapse, theme mode, command palette, toasts | Yes (theme + sidebar only) |
| `useGamificationStore` | XP, level, streak, badges | Yes (full state) |
| `useNotificationStore` | Notification list, SSE connection status | No |

### Replacing localStorage (Gamification)

**Before (scattered in DashboardLayout):**
```ts
// DashboardLayout.tsx — old pattern
const [xp, setXp] = useState(0);
useEffect(() => {
  const savedXp = localStorage.getItem("student_xp");
  if (savedXp) setXp(parseInt(savedXp));
  window.addEventListener("gamification-update", syncGamification);
}, []);
```

**After (Zustand store):**
```ts
// Any component
import { useGamificationStore } from "@/store";
const { xp, level, streakCount, awardXP } = useGamificationStore();

// Award XP after lesson completion:
awardXP(20); // auto-persists to localStorage via Zustand persist middleware
```

### Replacing useState in DashboardLayout

**Before:**
```ts
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
const [isMobileMenuOpen, setIsMobileMenuOpen]     = useState(false);
const [isSearchOpen, setIsSearchOpen]             = useState(false);
```

**After:**
```ts
import { useUIStore } from "@/store";
const { isSidebarCollapsed, isMobileMenuOpen, isCommandPaletteOpen,
        toggleSidebar, toggleMobileMenu, toggleCommandPalette } = useUIStore();
```

### Adding a New Store

1. Create `src/store/<name>-store.ts`  
2. Export types and `use<Name>Store`  
3. Add to `src/store/index.ts`  
4. If server data needs hydrating, add a hydrator component to `hydrators.tsx`

---

## 8. Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  READ path (Server Component → DB → RSC)                         │
│                                                                  │
│  page.tsx (Server Component)                                     │
│    └── requireAuth()           ← validates JWT cookie            │
│    └── feature/repository/*.ts ← Drizzle query                  │
│         └── db.ts proxy        ← resolves tenant schema          │
│         └── PostgreSQL         ← SET LOCAL search_path           │
│    └── serialised props        ← passed to Client Components     │
│    └── Zustand hydrators       ← stores populated client-side    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  WRITE path (Client Component → Server Action → DB)              │
│                                                                  │
│  <Form onSubmit>                                                 │
│    └── Server Action ("use server")                              │
│         └── requireAuth() / requirePermission()                  │
│         └── Zod schema validation                                │
│         └── feature/repository/*.ts Drizzle mutation            │
│         └── revalidatePath() or redirect()                       │
│         └── Returns { success, error } to the client            │
│    └── Client Component updates local UI or Zustand store       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  REAL-TIME path (SSE → Zustand → UI)                             │
│                                                                  │
│  NotificationBell (client component)                             │
│    └── EventSource("/api/notifications/stream")                  │
│    └── on message → useNotificationStore.addNotification()      │
│    └── Badge count re-renders reactively                        │
└──────────────────────────────────────────────────────────────────┘
```

### Database — Per-Tenant Schema Isolation

```
PostgreSQL instance
├── public schema          ← tenants table, global roles/permissions
├── tenant_vt schema       ← VT Institute's data (users, courses …)
├── tenant_intel schema    ← Intel Academy's data
├── tenant_nvidia schema   ← Nvidia's data
└── …
```

The `db.ts` proxy resolves the correct schema at query time:
1. Reads `x-tenant-subdomain` from `AsyncLocalStorage` (set by the Server Action or page)
2. Runs `SET LOCAL search_path = tenant_{subdomain}` before each transaction

Explicit overrides are possible via:
```ts
await dbSubdomainStorage.run("vt", async () => {
  return await db.query.users.findMany();
});
```

---

## 9. Routing Structure

All routes live under `src/app/` following Next.js App Router conventions.

### Public routes (no auth)

| Route | Description |
|---|---|
| `/` | Root page — SuperAdmin hub / org hub / public landing |
| `/login` | Tenant-aware login |
| `/signup` | Self-signup (if `allowSelfSignup` flag is on) |
| `/forgot-password` | Password reset request |
| `/admission/apply` | Public admission application form |
| `/checkout` | Payment page (Stripe/Razorpay) |
| `/verify/[certificateId]` | Public certificate verification |

### Authenticated routes (any role)

| Route | Description |
|---|---|
| `/dashboard` | Role-aware dashboard |
| `/courses` | Course catalogue |
| `/courses/[courseId]` | Course viewer (modules + lessons) |
| `/progress` | Student progress tracker |
| `/library` | Digital library |
| `/career` | Job board |
| `/profile` | User profile |
| `/faculty` | Faculty portal |

### Admin routes (Owner / Admin / Program Manager)

| Route | Description |
|---|---|
| `/admin/admissions` | Admission queue management |
| `/admin/courses` | Course & content management |
| `/admin/analytics` | Analytics dashboard |
| `/admin/placement` | Placement officer console |

### SuperAdmin routes

| Route | Description |
|---|---|
| `/super-admin` | Full platform control centre — tenants, RBAC, DB health |

### API routes

| Route | Method | Description |
|---|---|---|
| `/api/notifications/stream` | GET | SSE stream for real-time notifications |
| `/api/download` | GET | Signed S3 URL proxy for secure file downloads |
| `/api/mock-upload` | POST | Dev mock file upload endpoint |
| `/api/webhooks/stripe/[tenantId]` | POST | Stripe payment webhook handler |
| `/api/webhooks/zoom` | POST | Zoom meeting event webhook |

### Route Protection

`src/proxy.ts` (Next.js Middleware) protects all non-static, non-auth routes by
checking the `access_token` cookie.  Per-page role enforcement is done inside
Server Components with `requireAuth(["Admin", "Owner"])`.

---

## 10. API Integration Flow

### Stripe Payments

```
Client → /checkout page (Stripe Elements)
    │  Stripe.js collects card details (never hits our server)
    │
    ▼
Server Action: createPaymentIntentAction
    │  stripe.paymentIntents.create({ amount, currency, metadata: { tenantId, applicationId } })
    │  Returns clientSecret to client
    │
    ▼
Stripe.js confirms payment (client-side)
    │
    ▼
/api/webhooks/stripe/[tenantId]  (Stripe calls us)
    │  stripe.webhooks.constructEvent(body, sig, secret) — signature verified
    │  On payment_intent.succeeded:
    │    → Update admissionApplications.status = "approved"
    │    → Create user + student records
    │    → Dispatch welcome notification
```

### AWS S3 File Uploads

```
Client selects file
    ▼
Server Action: getPresignedUploadUrl
    │  @aws-sdk/s3-request-presigner
    │  PutObjectCommand with key = "tenants/{tenantId}/{uuid}.{ext}"
    │  Returns presigned URL (expires 15 min)
    ▼
Client PUTs file directly to S3 (no server bandwidth used)
    ▼
Client calls Server Action with the S3 key to persist the record
```

Download: `/api/download?key=...` proxies a `GetObjectCommand` presigned URL so
S3 objects are never directly exposed.

### Zoom Live Classes

```
Admin schedules lesson with contentType = "live_class"
    │  Zoom API: meetings.create() via Server Action
    │  Stores zoomMeetingId + zoomPasscode in lessons table
    │
    ▼
Students see "Join Live Class" button on lesson page
    │
    ▼
/api/webhooks/zoom  receives meeting.ended events
    │  Marks lesson as completed for attendees
```

### SSE Notifications

```
NotificationBell mounts → new EventSource("/api/notifications/stream")
    │  Server: readable stream + heartbeat every 30s
    │  Pushes JSON notification objects
    │
    ▼
useNotificationStore.addNotification(event.data)
    │
    ▼
Bell badge re-renders with updated unreadCount()
```

---

## 11. Setup & Installation

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 24.x (see `engines` in `package.json`) |
| npm | 10.x+ |
| Docker Desktop | latest |
| PostgreSQL | 15+ (via Docker below) |

### 1 — Clone the repository

```bash
git clone https://github.com/<org>/lms.git
cd lms
```

### 2 — Install dependencies

```bash
npm install
```

### 3 — Configure environment variables

```bash
cp .env.example .env
# Edit .env with your values — see §12 for full reference
```

### 4 — Start PostgreSQL

```bash
docker-compose up -d postgres
```

This starts a Postgres 15 instance on `localhost:5432` with the credentials
from `docker-compose.yml`.  The default database is `lms_coe_db`.

### 5 — Run migrations

```bash
npx drizzle-kit migrate
```

This applies all SQL files from `src/db/migrations/` in order.

### 6 — Seed the database (optional but recommended for dev)

```bash
npm run db:seed-pg
```

### 7 — Start the dev server

```bash
npm run dev
```

App is available at `http://localhost:3000`.

To test multi-tenancy locally, add entries to your hosts file:

```
127.0.0.1  vt.localhost
127.0.0.1  intel.localhost
127.0.0.1  nvidia.localhost
```

Then visit `http://vt.localhost:3000` to see the VT tenant portal.

---

## 12. Environment Variables

Copy `.env.example` to `.env` and fill in all required values.

```bash
# ─── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/lms_coe_db

# Set to "true" to use the in-memory JSON DB shim (no Postgres needed)
USE_JSON_DB=false

# ─── Auth ──────────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET=<min 32 char random string>
JWT_REFRESH_SECRET=<min 32 char random string>
# Token lifetimes (ms or zeit/ms strings)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Stripe ────────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── AWS S3 ────────────────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=wysbryx-lms-uploads

# ─── Zoom ──────────────────────────────────────────────────────────────────────
ZOOM_ACCOUNT_ID=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
ZOOM_WEBHOOK_SECRET_TOKEN=...

# ─── Email (Nodemailer) ────────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=no-reply@wysbryx.com
SMTP_PASS=<app-password>

# ─── App ───────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

> **Security**: Never commit `.env` to version control.  
> Use a secrets manager (AWS Secrets Manager, Doppler, Vault) in production.

---

## 13. Build & Deployment

### Local production build

```bash
npm run build
npm start
```

### Docker

```bash
# Build image
docker build -t wysbryx-lms:latest .

# Run container
docker run -p 3000:3000 --env-file .env wysbryx-lms:latest
```

### Docker Compose (full stack)

```bash
docker-compose up --build
```

This starts `postgres` + `lms` services together.

### Vercel (recommended for edge deployment)

1. Push your branch to GitHub
2. Import the repository in Vercel
3. Set all environment variables in the Vercel dashboard
4. Vercel auto-detects Next.js — no build command changes needed

**Important Vercel settings:**
- Framework Preset: `Next.js`
- Node.js version: `24.x`
- Add all env vars from §12

### Database Migrations in CI/CD

Run migrations as a pre-deploy step:

```bash
npx drizzle-kit migrate
```

Or add to your CI pipeline:

```yaml
- name: Run DB migrations
  run: npx drizzle-kit migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Available npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with HMR |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run db:up` | Start Postgres via Docker Compose |
| `npm run db:seed-pg` | Seed PostgreSQL with sample data |
| `npm run db:test-pg` | Run schema isolation test |

---

## 14. Coding Conventions

### File naming

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `DashboardLayout.tsx` |
| Hooks / stores | camelCase with prefix | `use-auth-store.ts` → `auth-store.ts` |
| Server Actions | kebab-case | `auth-actions.ts` |
| Repository files | kebab-case | `course-repository.ts` |
| Utilities | kebab-case | `date-formatter.ts` |
| Pages | `page.tsx` inside folder | `app/courses/[courseId]/page.tsx` |

### Component patterns

```ts
// ✅ Server Component (default) — no "use client", can be async
export default async function CoursePage({ params }) {
  const user   = await requireAuth(["Student", "Faculty"]);
  const course = await getCourseById(params.courseId);
  return <CourseViewer course={course} user={user} />;
}

// ✅ Client Component — explicit directive at the top
"use client";
import { useUIStore } from "@/store";
export function CourseViewer({ course, user }) {
  const { addToast } = useUIStore();
  // …
}
```

### Server Actions

```ts
"use server";

export async function updateCourseAction(formData: UpdateCourseInput) {
  const user = await requireAuth(["Admin", "Owner"]);
  verifyWriteAccess(user);                     // block Guest
  const validated = updateCourseSchema.parse(formData);
  await courseRepository.update(validated);
  revalidatePath("/admin/courses");
  return { success: true };
}
```

### Zustand store pattern

```ts
// 1. Define types above the store
interface FooState { items: Item[]; isLoading: boolean; ... }

// 2. Create store with devtools (+ persist if needed)
export const useFooStore = create<FooState>()(
  devtools(
    (set, get) => ({
      items: [],
      isLoading: false,
      loadItems: async () => { /* ... */ },
    }),
    { name: "FooStore" }   // shown in Redux DevTools
  )
);

// 3. Use granular selectors in components
const items     = useFooStore(s => s.items);      // ✅ only re-renders when items changes
const loadItems = useFooStore(s => s.loadItems);  // ✅ stable reference
```

### Zod schemas for all inputs

All Server Action inputs and form payloads must have a Zod schema in
`features/<module>/schemas/`.  This ensures consistent validation on both
client (react-hook-form resolver) and server.

### Import aliases

Use `@/` for all internal imports (mapped to `src/`):

```ts
import { requireAuth }      from "@/features/auth/services/session";
import { useAuthStore }     from "@/store";
import { cn }               from "@/lib/utils";
```

### RBAC guard checklist for new routes

1. Server Component: `await requireAuth(["Role1", "Role2"])`
2. Server Action: `await requireAuth()` + `verifyWriteAccess(user)` for mutations
3. Client Component: use `useAuthStore(s => s.hasRole([...]))` for conditional rendering only — never as the sole guard

---

## 15. Future Improvements

### State management
- [ ] Add a `courseStore` to cache the active course/module/lesson state during a learning session, eliminating redundant DB calls on lesson navigation
- [ ] Introduce `immer` middleware in complex stores where deeply nested state updates are frequent
- [ ] Add Zustand devtools integration guide to the onboarding docs

### Architecture
- [ ] Extract a shared `types/` directory for domain entities (User, Tenant, Course …) to avoid type duplication between store types and DB schema types
- [ ] Add a React Query (TanStack Query) layer for client-side data fetching with caching, rather than triggering full page re-renders on every Server Action
- [ ] Move the middleware proxy from `src/proxy.ts` into the conventional `src/middleware.ts` with explicit matcher export

### Features
- [ ] Live class recording storage and replay (post-Zoom-meeting S3 upload)
- [ ] AI-powered quiz question generation from lesson content
- [ ] Mobile app (React Native) consuming the same Server Actions via a REST shim
- [ ] Parent dashboard — guardian access to student progress
- [ ] Bulk CSV student import with progress tracking
- [ ] Email digest for unread notifications (daily/weekly)
- [ ] OpenTelemetry tracing for per-request performance observability

### Quality
- [ ] Add Vitest unit tests for all repository and service functions
- [ ] Add Playwright E2E tests for critical flows (login, admission, checkout)
- [ ] Enable Drizzle strict mode and document migration naming conventions
- [ ] Set up Sentry for error monitoring in production

### DevOps
- [ ] Kubernetes Helm chart for multi-replica deployment
- [ ] Read-replica Postgres for analytics queries
- [ ] CDN for static assets and lesson media (CloudFront)
- [ ] Automated database backup pipeline

---

## Contributing

1. Create a feature branch from `master`: `git checkout -b feat/<scope>-<description>`
2. Follow the coding conventions in §14
3. Ensure `npm run lint` passes before pushing
4. Open a pull request with a clear title (≤70 chars) and a description covering:
   - What was changed and why
   - How it was tested
   - Any blocked or follow-up items

---

*Self-documented — any developer should be able to understand, set up, and contribute to this project using only this README.*
