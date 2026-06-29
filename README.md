# Virginia Tech Semiconductor Center of Excellence LMS

A state-of-the-art, premium SaaS Learning Management System built for the Intel Semiconductor Academy and physical layout engineering hub.

---

## ⚡ Architecture Overview

This platform features a **Dual-Mode Hybrid Database Layer** designed to switch between enterprise-grade **PostgreSQL** and a lightweight, zero-dependency **JSON/SQLite File Database** with zero changes to page code, API endpoints, or repository layers.

```
                  ┌────────────────────────────────────────┐
                  │          Next.js Application           │
                  │   (Pages, API Routes, Repositories)   │
                  └───────────────────┬────────────────────┘
                                      │
                         [Import `db` from `@/db/db`]
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │            Database Router             │
                  │        (Reads USE_JSON_DB env)         │
                  └─────────┬────────────────────┬─────────┘
                            │                    │
             (USE_JSON_DB=false)│                    │(USE_JSON_DB=true)
                            ▼                    ▼
             ┌─────────────────────────┐  ┌─────────────────────────┐
             │       PostgreSQL        │  │     JSON DB Proxy       │
             │   (Drizzle-orm Client)  │  │   (sqlite3 in /tmp)     │
             └─────────────────────────┘  └───────────┬─────────────┘
                                                      │
                                                      ▼
                                          ┌─────────────────────────┐
                                          │      /tmp/db.json       │
                                          │  (Persistent VM State)  │
                                          └─────────────────────────┘
```

---

## 🛠️ Hybrid Database Engine

### 1. Dual-Mode DB Router (`src/db/db.ts`)
The connection layer dynamically exports either the standard PostgreSQL database instance or a proxied SQL engine depending on the environment configuration:
- **PostgreSQL Mode**: Uses `drizzle-orm/postgres-js` with automated hot-reload pooling.
- **JSON/SQLite Mode**: Uses a proxy wrapper that routes all standard database reads and mutations through an in-memory SQLite schema loaded from and persisted to a structured `db.json` file.

### 2. Drizzle Query Proxy (`src/db/json-db-provider.ts`)
To prevent refactoring downstream page-level queries, the JSON database engine proxies all Drizzle relational queries. It maps:
- `db.query.<table>.findMany(...)`
- `db.query.<table>.findFirst(...)`
- `db.insert(...)`
- `db.update(...)`
- `db.delete(...)`

Directly to SQLite equivalents at runtime. The engine is backed by Node.js's native high-performance `node:sqlite` module (available in Node.js >= 22.5.0).

---

## 🚀 Vercel Serverless Hosting Optimization

Deploying standard database files to serverless platforms like Vercel usually fails because the deployment directory (`/var/task/`) is read-only. 

To overcome this, our JSON DB Provider uses an **ephemeral replication system**:
1. **Self-Healing Startup Check**:
   - On initialization, the app checks if a database file exists in `/tmp/db.json` (the only writeable path in Vercel serverless environments).
   - If not found, it replicates the initial seeds from the read-only workspace `db.json` into `/tmp/db.json`.
2. **Runtime Mutation Syncing**:
   - Every read and write transaction is executed against the SQLite database initialized at `/tmp/db.json`.
   - When updates occur, they are formatted and flushed back to `/tmp/db.json` instantly, ensuring that session states, admissions, payments, and quiz attempts persist across function invocations within the VM lifecycle.

---

## ⚙️ Environment Variables

Configure these variables in your `.env` or Vercel Environment Configuration console:

```env
# Toggle between PostgreSQL and JSON file mode
USE_JSON_DB=true

# Database URL for PostgreSQL mode
DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/lms_coe_db

# Application session secrets
JWT_SECRET=super-secret-jwt-key-change-this
SESSION_SECRET=super-secret-session-cookie-key
```

---

## 💻 Local CLI Operations

### Run in JSON Mode Locally
```bash
# Set environment flag and start Next.js Development Server
set USE_JSON_DB=true
npm run dev
```

### Build for Production
```bash
# Run compiler checking and bundle optimization
set USE_JSON_DB=true
npm run build
```

### Database Seeding & Setup (PostgreSQL)
```bash
# Push schema migrations
npx drizzle-kit push

# Seed postgres database
npm run db:seed
```
