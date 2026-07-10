# 🌱 LMS Database Seeding Guide

This guide describes how the multi-tenant, multi-database architecture is seeded, how to run seeding locally, and how to seed a production database (e.g. AWS RDS or self-hosted Postgres on EC2) without relying on any local JSON database files.

---

## 🏗️ The Multi-Database Architecture

You configure **one** master `DATABASE_URL` in your `.env`. The database seeding script uses that single connection to automatically provision **multiple physical databases** on the Postgres cluster:

```
DATABASE_URL="postgresql://postgres:postgres123@127.0.0.1:5432/lms_coe_db"
                          ─────────┬──────────── ───────┬──────── ────┬────
                               user:pass            host:port     default db
```

During execution, the script:
1. Connects to the default `postgres` administrative database.
2. Drops and recreates the target physical databases:
   - `vt_db`: Houses the Virginia Tech parent tenant and its child organizations (Intel, AMD, Nvidia, Mellanox).
   - `test1_db`: Houses TSMC and associated test organization sub-tenants.
   - `lms_coe_db`: The primary dashboard fallback.
3. Automatically runs Drizzle migrations to initialize all tables.
4. Switches to the appropriate isolated Postgres **schemas** (`tenant_vt`, `tenant_intel`, etc.) inside each database and inserts the seed data.

---

## 🚀 Seeding a Production Postgres / RDS Instance

When deploying to **EC2** or using **AWS RDS**, there is **no need for a `db.json` file**. The Postgres seed script (`src/db/seed-postgres.ts`) is **100% self-contained** and programmatically generates all tenants, courses, batches, and student data using raw Drizzle models.

Follow these steps to deploy and seed your production database:

### Step 1: Configure Environment Variables
On your EC2 host (or inside your production Docker container environment), set the following environment variables:

```env
# Disable local JSON proxy database mode (forces real Postgres)
USE_JSON_DB="false"

# Point to your production RDS/Postgres database instance
DATABASE_URL="postgresql://db_user:db_password@your-rds-endpoint.amazonaws.com:5432/lms_coe_db"
```

> [!IMPORTANT]
> The database user provided in the `DATABASE_URL` must have **`CREATEDB`** privileges. The seed script needs this privilege to drop/recreate the databases (`vt_db`, `test1_db`, `lms_coe_db`) on your Postgres/RDS server.
>
> If you are using a managed RDS instance where you cannot grant full superuser creation rights, ensure that the target databases (`vt_db`, `test1_db`, `lms_coe_db`) already exist, or run the Drizzle migrations and seed script against the pre-provisioned database directly.

### Step 2: Push Drizzle Schemas
From your application root, run Drizzle Kit to create the base tables:
```bash
npx drizzle-kit push
```

### Step 3: Run the Seed Script
Execute the self-contained seeding script. It connects to the database specified in your `DATABASE_URL`, provisions the multi-tenant structures, and populates the records:
```bash
npm run db:seed-pg
```
This is fully automated and creates:
- The `Wysbryx Platform` global super admin account.
- 8 production-ready tenants & child domains.
- 120+ active student records, payment histories, and certifications.

### Step 4: Verify the Remote Database
Confirm that database connections and schemas are isolated and active:
```bash
npm run db:test-pg
```

---

## 🔒 Production Credentials

Once seeded, the default accounts are configured with the password **`Password123`**:

| Role | Email Address | Description |
|------|---------------|-------------|
| **Super Admin** | `superadmin@vt.edu` (displayed as `superadmin@wysbryx.com` on root) | Global SaaS platform administrator |
| **Academy Owner** | `owner@{subdomain}.lms.com` | Owner of the specified tenant (e.g. `owner@vt.lms.com`) |
| **Academy Admin** | `admin@{subdomain}.lms.com` | Admin of the specified tenant (e.g. `admin@intel.lms.com`) |
| **Faculty** | `faculty@{subdomain}.lms.com` | Instructor profile (e.g. `faculty@mellanox.lms.com`) |
| **Student** | `student1@student.{subdomain}.com` | Trainee account (e.g. `student1@student.amd.com`) |
