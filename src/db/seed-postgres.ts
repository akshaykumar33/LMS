import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, "utf-8");
    for (const line of env.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const getAdminConnectionString = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is required.");
  }
  try {
    const url = new URL(dbUrl);
    url.pathname = "/postgres";
    return url.toString();
  } catch {
    return dbUrl;
  }
};
// Administrative connection pointing to default 'postgres' database
const adminConnectionString = getAdminConnectionString();

async function main() {
  console.log("🌱 [POSTGRES SEED] Connecting to administrative Postgres...");
  const adminClient = postgres(adminConnectionString, { max: 1 });

  const defaultDbName = new URL(process.env.DATABASE_URL!).pathname.replace("/", "") || "postgres";

  // 1. Recreate Physical Databases (vt_db / vti_db, nvidia_db, test1_db)
  const databasesToCreate = Array.from(new Set(["vti_db", "vt_db", "nvidia_db", "test1_db"]));
  
  for (const dbName of databasesToCreate) {
    if (dbName === "postgres") continue;
    console.log(`🧹 Recreating database: ${dbName}...`);
    // Terminate existing connections first to avoid "database is being accessed" errors
    try {
      await adminClient.unsafe(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${dbName}'
          AND pid <> pg_backend_pid();
      `);
    } catch (e) {
      // Ignore errors if pg_stat_activity cannot be queried
    }
    
    await adminClient.unsafe(`DROP DATABASE IF EXISTS ${dbName}`);
    await adminClient.unsafe(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Database ${dbName} created.`);
  }
  await adminClient.end();

  // Load raw data from db.json
  console.log("📂 Loading raw data from db.json...");
  const dbJsonPath = path.join(__dirname, "../../db.json");
  if (!fs.existsSync(dbJsonPath)) {
    console.error(`❌ db.json not found at ${dbJsonPath}`);
    process.exit(1);
  }
  const dbDataRaw = JSON.parse(fs.readFileSync(dbJsonPath, "utf-8"));

  const migrationDir = path.join(__dirname, "migrations");
  const migrationFiles = [
    "0000_chief_inertia.sql",
    "0001_tiresome_hellfire_club.sql",
    "0002_add_notifications.sql",
    "0003_bright_havok.sql",
    "0004_dizzy_polaris.sql",
    "0005_library_metadata.sql",
    "0006_ai_book_bot_context.sql",
    "0007_add_lesson_difficulty.sql",
    "0008_create_subjective_submissions.sql",
    "0009_create_batch_sessions.sql",
    "0010_fix_progress_tables.sql"
  ];

  // Helper to execute migrations on a target database and schema
  const runMigrations = async (dbUrl: string, targetSchema: string, skipTenantsTable = false) => {
    const client = postgres(dbUrl, { max: 1 });
    const db = drizzle(client, { schema });
    
    await db.execute(sql.raw(`SET search_path TO "${targetSchema}", public`));

    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);
      if (!fs.existsSync(filePath)) continue;

      const rawSql = fs.readFileSync(filePath, "utf-8");
      const statements = rawSql
        .split("--> statement-breakpoint")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (let stmt of statements) {
        // Skip creating or altering the central 'tenants' table if instructed
        if (skipTenantsTable && (
          stmt.includes('CREATE TABLE "tenants"') || 
          stmt.includes('ALTER TABLE "tenants"') || 
          stmt.includes('CREATE INDEX "tenants_') || 
          stmt.includes('CONSTRAINT "tenants_')
        )) {
          continue;
        }

        // Adjust references to connect locally in this schema
        stmt = stmt.replace(/REFERENCES "public"\."(?!tenants")([a-zA-Z0-9_]+)"/g, 'REFERENCES "$1"');

        try {
          await db.execute(sql.raw(stmt));
        } catch (err: any) {
          const msg = (err?.message || "") + " " + (err?.cause?.message || "") + " " + (err?.cause?.code || "");
          if (!msg.includes("already exists") && !msg.includes("42P07") && !msg.includes("42710")) {
            console.error(`Error in ${targetSchema} running SQL:`, stmt);
            throw err;
          }
        }
      }
    }
    await client.end();
  };

  // Helper to get connection URL for a specific database
  const getDbUrl = (dbName: string) => {
    const url = new URL(adminConnectionString);
    url.pathname = `/${dbName}`;
    return url.toString();
  };

  // Helper to seed a target schema from a source subdomain in db.json
  const seedTenantSchemaFromSource = async (
    dbUrl: string,
    schemaName: string,
    tenantId: string,
    tenantSubdomain: string,
    tenantName: string,
    sourceSubdomain: string
  ) => {
    console.log(`   🌱 Seeding schema "${schemaName}" in ${dbUrl.split("/").pop()} using source "${sourceSubdomain}"...`);
    const client = postgres(dbUrl, { max: 1 });
    const db = drizzle(client, { schema });
    
    await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));
    await runMigrations(dbUrl, schemaName, true);
    await db.execute(sql.raw(`SET search_path TO "${schemaName}", public`));

    // Find source tenant
    const sourceTenant = dbDataRaw.tenants.find((t: any) => t.subdomain === sourceSubdomain);
    if (!sourceTenant) {
      console.error(`   ❌ Source tenant for subdomain "${sourceSubdomain}" not found in db.json`);
      await client.end();
      return;
    }
    const sourceTenantId = sourceTenant.id;

    // List of tables to seed in order of foreign key dependencies
    const tablesToSeed = [
      { key: "permissions", drizzleTable: schema.permissions },
      { key: "roles", drizzleTable: schema.roles },
      { key: "role_permissions", drizzleTable: schema.rolePermissions },
      { key: "users", drizzleTable: schema.users },
      { key: "batches", drizzleTable: schema.batches },
      { key: "courses", drizzleTable: schema.courses },
      { key: "course_batches", drizzleTable: schema.courseBatches },
      { key: "students", drizzleTable: schema.students },
      { key: "admission_applications", drizzleTable: schema.admissionApplications },
      { key: "admission_documents", drizzleTable: schema.admissionDocuments },
      { key: "admission_payments", drizzleTable: schema.admissionPayments },
      { key: "modules", drizzleTable: schema.modules },
      { key: "lessons", drizzleTable: schema.lessons },
      { key: "quizzes", drizzleTable: schema.quizzes },
      { key: "quiz_questions", drizzleTable: schema.quizQuestions },
      { key: "quiz_attempts", drizzleTable: schema.quizAttempts },
      { key: "notifications", drizzleTable: schema.notifications },
      { key: "job_postings", drizzleTable: schema.jobPostings },
      { key: "job_applications", drizzleTable: schema.jobApplications },
      { key: "certificates", drizzleTable: schema.certificates },
      { key: "digital_library", drizzleTable: schema.digitalLibrary },
      { key: "lesson_progress", drizzleTable: schema.lessonProgress },
      { key: "projects", drizzleTable: schema.projects },
      { key: "project_submissions", drizzleTable: schema.projectSubmissions },
    ];

    // Build set of role IDs that belong to the source tenant to filter role_permissions
    const sourceRoleIds = new Set(
      (dbDataRaw.roles || [])
        .filter((r: any) => r.tenantId === sourceTenantId || r.tenantId === null)
        .map((r: any) => r.id)
    );

    for (const { key, drizzleTable } of tablesToSeed) {
      const sourceRows = dbDataRaw[key] || [];
      let filteredRows = [];

      if (key === "permissions") {
        filteredRows = sourceRows;
      } else if (key === "roles") {
        filteredRows = sourceRows.filter((r: any) => r.tenantId === sourceTenantId || r.tenantId === null);
      } else if (key === "role_permissions") {
        filteredRows = sourceRows.filter((rp: any) => sourceRoleIds.has(rp.roleId));
      } else {
        // All other tables have a tenantId column
        filteredRows = sourceRows.filter((r: any) => r.tenantId === sourceTenantId);
      }

      if (filteredRows.length === 0) continue;
      // Transform rows
      const targetRows = filteredRows.map((row: any) => {
        const copy = { ...row };
        
        // Update tenantId
        if (copy.tenantId !== undefined && copy.tenantId !== null) {
          copy.tenantId = tenantId;
        }

        // ─── Comprehensive NOT NULL fallback map for all seeded tables ───
        // Prevents constraint violations when db.json contains test rows with missing/null values
        const fallbacks: Record<string, Record<string, any>> = {
          students: {
            rollNumber: `ROLL-${copy.id?.substring(0, 8).toUpperCase() || "UNKNOWN"}`,
            admissionNumber: `ADM-${copy.id?.substring(0, 8).toUpperCase() || "UNKNOWN"}`,
          },
          admission_documents: {
            documentName: "Document",
            fileUrl: "https://dummy-bucket.s3.amazonaws.com/admissions/docs/transcript.pdf",
          },
          admission_payments: {
            amount: "0.00",
            paymentMethod: "Stripe",
            status: "completed",
          },
          job_postings: {
            company: "Wysbryx Partner",
            description: "Exciting semiconductor engineering role.",
            requirements: "See posting for details.",
            location: "Remote",
            type: "job",
            isActive: true,
          },
          job_applications: {
            resumeUrl: "https://dummy-bucket.s3.amazonaws.com/resumes/default.pdf",
            status: "applied",
          },
          notifications: {
            title: "Notification",
            message: "System notification.",
            type: "info",
            isRead: false,
          },
          digital_library: {
            title: "Untitled Resource",
            fileUrl: "https://dummy-bucket.s3.amazonaws.com/library/default.pdf",
            category: "book",
          },
          lesson_progress: {
            completed: false,
          },
          project_submissions: {
            gitRepoUrl: "https://github.com/placeholder/repo",
            status: "pending",
          },
          certificates: {
            certificateCode: `CERT-${copy.id?.substring(0, 12).toUpperCase() || "UNKNOWN"}`,
          },
        };
        if (fallbacks[key]) {
          for (const [field, defaultVal] of Object.entries(fallbacks[key])) {
            if (copy[field] === null || copy[field] === undefined) {
              copy[field] = defaultVal;
            }
          }
        }

        // Fallback for null courseId in quizzes by resolving from moduleId or tenant courses
        if (key === "quizzes" && (!copy.courseId || copy.courseId === null)) {
          if (copy.moduleId) {
            const mod = dbDataRaw.modules.find((m: any) => m.id === copy.moduleId);
            if (mod) {
              copy.courseId = mod.courseId;
            }
          }
          if (!copy.courseId) {
            const firstCourse = dbDataRaw.courses.find((c: any) => c.tenantId === sourceTenantId);
            if (firstCourse) {
              copy.courseId = firstCourse.id;
            }
          }
        }

        // Transform quiz_questions options format & correctOptionId
        if (key === "quiz_questions") {
          if (Array.isArray(copy.options) && copy.options.length > 0 && typeof copy.options[0] === "string") {
            copy.options = copy.options.map((opt: string, idx: number) => ({
              id: String(idx),
              text: opt
            }));
            if (copy.correctAnswerIndex !== undefined && copy.correctAnswerIndex !== null) {
              copy.correctOptionId = String(copy.correctAnswerIndex);
            }
          }
          if (!copy.correctOptionId) {
            copy.correctOptionId = "0";
          }
        }

        // Update email domain for users to match the target subdomain
        if (key === "users" && copy.email) {
          let email = copy.email;
          email = email.replace(`@student.${sourceSubdomain}.com`, `@student.${tenantSubdomain}.com`);
          email = email.replace(`@${sourceSubdomain}.lms.com`, `@${tenantSubdomain}.lms.com`);
          
          // Generic fallback replacements for any other subdomains
          const knownSubdomains = ["vt", "intel", "amd", "tsmc", "nvidia"];
          for (const known of knownSubdomains) {
            email = email.replace(`@student.${known}.com`, `@student.${tenantSubdomain}.com`);
            email = email.replace(`@${known}.lms.com`, `@${tenantSubdomain}.lms.com`);
          }
          copy.email = email;
        }

        // Fallback for ALL null/undefined notNull timestamp fields across all tables
        const tsNow = new Date();
        for (const tsField of ["createdAt", "updatedAt", "issuedAt", "submittedAt"]) {
          if (copy[tsField] === null || copy[tsField] === undefined) {
            copy[tsField] = tsNow;
          }
        }

        // Convert date/timestamp strings to Date objects
        for (const [k, v] of Object.entries(copy)) {
          if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}/)) {
            const d = new Date(v);
            if (!isNaN(d.getTime())) {
              copy[k] = d;
            }
          }
        }

        return copy;
      });
      // Insert targetRows in batches of 50 to avoid exceeding query limits
      const batchSize = 50;
      for (let i = 0; i < targetRows.length; i += batchSize) {
        const chunk = targetRows.slice(i, i + batchSize);
        await db.insert(drizzleTable).values(chunk).onConflictDoNothing();
      }
    }

    console.log(`   └─ Schema "${schemaName}" seeded successfully.`);
    await client.end();
  };

  // ==========================================
  // PROVISIONING DATABASE 1: vt_db (Virginia Tech parent + sub-tenants)
  // ==========================================
  const vtDbUrl = getDbUrl("vt_db");
  console.log("\n📦 [DATABASE: vt_db] Provisioning...");
  await runMigrations(vtDbUrl, "public", false);

  const vtClient = postgres(vtDbUrl, { max: 1 });
  const vtDb = drizzle(vtClient, { schema });

  // Seed VT Central Registry Records with Static IDs matching db.json
  const [wysbryxTenant] = await vtDb.insert(schema.tenants).values({
    id: "96652527-1198-4bbb-8bc4-30781efaed18",
    name: "Wysbryx Platform",
    subdomain: "wysbryx",
    customDomain: "wysbryx.com",
    dbName: "vt_db",
    status: "active",
    branding: { logoUrl: "https://www.wysbryx.com/wysbryx_v.png", primaryColor: "#f97316" },
    settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000, maxCourses: 1000 } }
  }).returning();

  const [vtTenant] = await vtDb.insert(schema.tenants).values({
    id: "96652527-1198-4bbb-8bc4-30781efaed17",
    name: "Virginia Tech",
    subdomain: "vt",
    customDomain: "vt-lms.edu",
    dbName: "vt_db",
    parentTenantId: wysbryxTenant.id,
    status: "active",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Virginia_Tech_Gobblers_logo.svg", primaryColor: "#861F41" },
    settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 500, maxCourses: 100 } }
  }).returning();

  const [intelTenant] = await vtDb.insert(schema.tenants).values({
    id: "03e6d706-6e79-4dc5-96c1-e10f1beff95c",
    name: "Intel Semiconductor Academy",
    subdomain: "intel",
    customDomain: "intel-academy.com",
    dbName: "vt_db",
    status: "active",
    parentTenantId: vtTenant.id,
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg", primaryColor: "#0068B5" },
    settings: { features: { enableLibrary: true, enablePlacement: true }, gateways: { stripe: true }, restrictions: { maxUsers: 200 } }
  }).returning();

  const [intelOregonTenant] = await vtDb.insert(schema.tenants).values({
    id: "8c1598f4-6e79-4dc5-96c1-e10f1beff95c",
    name: "Intel Oregon Labs",
    subdomain: "intel-oregon",
    customDomain: "intel-oregon.com",
    dbName: "vt_db",
    status: "active",
    parentTenantId: intelTenant.id,
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg", primaryColor: "#0068B5" },
    settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 100 } }
  }).returning();

  const [amdTenant] = await vtDb.insert(schema.tenants).values({
    id: "4491103f-37e0-44bd-9458-acde5af99a18",
    name: "AMD Training Center",
    subdomain: "amd",
    customDomain: "amd-coe.com",
    dbName: "vt_db",
    status: "active",
    parentTenantId: vtTenant.id,
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg", primaryColor: "#ED1C24" },
    settings: { features: { enableLibrary: true, enablePlacement: false }, gateways: { stripe: true }, restrictions: { maxUsers: 150 } }
  }).returning();

  await vtClient.end();

  // Seed schemas inside vt_db
  await seedTenantSchemaFromSource(vtDbUrl, "tenant_vt", vtTenant.id, "vt", "Virginia Tech", "vt");
  await seedTenantSchemaFromSource(vtDbUrl, "tenant_wysbryx", wysbryxTenant.id, "wysbryx", "Wysbryx Platform", "vt");
  await seedTenantSchemaFromSource(vtDbUrl, "tenant_intel", intelTenant.id, "intel", "Intel Academy", "intel");
  await seedTenantSchemaFromSource(vtDbUrl, "tenant_intel_oregon", intelOregonTenant.id, "intel-oregon", "Intel Oregon", "intel");
  await seedTenantSchemaFromSource(vtDbUrl, "tenant_amd", amdTenant.id, "amd", "AMD Training", "amd");

  // Seed SuperAdmin user into tenant_wysbryx schema
  console.log("👤 Seeding SuperAdmin user into tenant_wysbryx schema...");
  {
    const saClient = postgres(vtDbUrl, { max: 1 });
    const passwordHash = await bcrypt.hash("Password123", 10);
    await saClient.unsafe(`SET search_path TO "tenant_wysbryx", public`);
    await saClient.unsafe(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $3, role = $6
    `, [wysbryxTenant.id, "superadmin@wysbryx.com", passwordHash, "Wysbryx", "Super Admin", "SuperAdmin", "active"]);
    await saClient.end();
    console.log("   └─ SuperAdmin seeded in tenant_wysbryx.");
  }

  // Seed Owner user into tenant_vt schema
  console.log("👤 Seeding Owner user into tenant_vt schema...");
  {
    const saClient = postgres(vtDbUrl, { max: 1 });
    const passwordHash = await bcrypt.hash("Password123", 10);
    await saClient.unsafe(`SET search_path TO "tenant_vt", public`);
    await saClient.unsafe(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $3, role = $6
    `, [vtTenant.id, "owner@vt.lms.com", passwordHash, "VT", "Owner", "Owner", "active"]);
    await saClient.end();
    console.log("   └─ Owner seeded in tenant_vt.");
  }

  // ==========================================
  // PROVISIONING DATABASE: vti_db (VTI Parent + Intel, AMD, Qualcomm Schemas)
  // ==========================================
  const vtiDbUrl = getDbUrl("vti_db");
  console.log("\n📦 [DATABASE: vti_db] Provisioning VTI Parent & Child Schemas...");
  await runMigrations(vtiDbUrl, "public", false);

  const vtiClient = postgres(vtiDbUrl, { max: 1 });
  const vtiDb = drizzle(vtiClient, { schema });

  await vtiDb.insert(schema.tenants).values({
    id: "96652527-1198-4bbb-8bc4-30781efaed18",
    name: "Wysbryx Platform",
    subdomain: "wysbryx",
    customDomain: "wysbryx.com",
    dbName: "vt_db",
    status: "active",
    branding: { logoUrl: "https://www.wysbryx.com/wysbryx_v.png", primaryColor: "#f97316" },
    settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000, maxCourses: 1000 } }
  }).onConflictDoNothing();

  const [vtiTenant] = await vtiDb.insert(schema.tenants).values({
    id: "96652527-1198-4bbb-8bc4-30781efaed19",
    name: "VTI Enterprise",
    subdomain: "vti",
    customDomain: "vti-lms.com",
    dbName: "vti_db",
    parentTenantId: wysbryxTenant.id,
    status: "active",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Virginia_Tech_Gobblers_logo.svg", primaryColor: "#861F41", secondaryColor: "#1e293b" },
    settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 2000, maxCourses: 200 } }
  }).returning();

  await vtiDb.insert(schema.tenants).values([
    {
      id: "03e6d706-6e79-4dc5-96c1-e10f1beff95c",
      name: "Intel Semiconductor Academy",
      subdomain: "intel",
      customDomain: "intel-academy.com",
      dbName: "vti_db",
      status: "active",
      parentTenantId: vtiTenant.id,
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg", primaryColor: "#0068B5" },
      settings: { features: { enableLibrary: true, enablePlacement: true }, gateways: { stripe: true }, restrictions: { maxUsers: 200 } }
    },
    {
      id: "4491103f-37e0-44bd-9458-acde5af99a18",
      name: "AMD Training Center",
      subdomain: "amd",
      customDomain: "amd-coe.com",
      dbName: "vti_db",
      status: "active",
      parentTenantId: vtiTenant.id,
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg", primaryColor: "#ED1C24" },
      settings: { features: { enableLibrary: true, enablePlacement: false }, gateways: { stripe: true }, restrictions: { maxUsers: 150 } }
    },
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e99",
      name: "Qualcomm Institute",
      subdomain: "qualcomm",
      customDomain: "qualcomm.com",
      dbName: "vti_db",
      status: "active",
      parentTenantId: vtiTenant.id,
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Qualcomm-Logo.svg", primaryColor: "#3253DC" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 500 } }
    }
  ]).onConflictDoNothing();

  await vtiClient.end();

  // Seed schemas inside vti_db
  await seedTenantSchemaFromSource(vtiDbUrl, "tenant_vti", vtiTenant.id, "vt", "VTI Parent", "vt");
  await seedTenantSchemaFromSource(vtiDbUrl, "tenant_intel", intelTenant.id, "intel", "Intel Schema", "intel");
  await seedTenantSchemaFromSource(vtiDbUrl, "tenant_amd", amdTenant.id, "amd", "AMD Schema", "amd");
  await seedTenantSchemaFromSource(vtiDbUrl, "tenant_qualcomm", "019915ce-3b05-4db3-a1c0-365f772f4e99", "qualcomm", "Qualcomm Schema", "amd");

  // Seed VTI Owner in vti_db tenant_vti schema
  {
    const vtiOwnerClient = postgres(vtiDbUrl, { max: 1 });
    const pwHash = await bcrypt.hash("Password123", 10);
    await vtiOwnerClient.unsafe(`SET search_path TO "tenant_vti", public`);
    await vtiOwnerClient.unsafe(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $3, role = $6
    `, [vtiTenant.id, "owner@vti.com", pwHash, "VTI", "Owner", "Owner", "active"]);
    await vtiOwnerClient.end();
  }

  // ==========================================
  // PROVISIONING DATABASE: nvidia_db (NVIDIA Parent + Gaming, AI, Mellanox Schemas)
  // ==========================================
  const nvidiaDbUrl = getDbUrl("nvidia_db");
  console.log("\n📦 [DATABASE: nvidia_db] Provisioning NVIDIA Parent & Child Schemas...");
  await runMigrations(nvidiaDbUrl, "public", false);

  const nvidiaClient = postgres(nvidiaDbUrl, { max: 1 });
  const nvidiaDb = drizzle(nvidiaClient, { schema });

  await nvidiaDb.insert(schema.tenants).values({
    id: "96652527-1198-4bbb-8bc4-30781efaed18",
    name: "Wysbryx Platform",
    subdomain: "wysbryx",
    customDomain: "wysbryx.com",
    dbName: "vt_db",
    status: "active",
    branding: { logoUrl: "https://www.wysbryx.com/wysbryx_v.png", primaryColor: "#f97316" },
    settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000, maxCourses: 1000 } }
  }).onConflictDoNothing();

  const [nvidiaTenant] = await nvidiaDb.insert(schema.tenants).values({
    id: "96652527-1198-4bbb-8bc4-30781efaed20",
    name: "NVIDIA Corporation",
    subdomain: "nvidia",
    customDomain: "nvidia-lms.com",
    dbName: "nvidia_db",
    parentTenantId: wysbryxTenant.id,
    status: "active",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg", primaryColor: "#76B900", secondaryColor: "#1a1a1a" },
    settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 5000, maxCourses: 500 } }
  }).returning();

  await nvidiaDb.insert(schema.tenants).values([
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e55",
      name: "Gaming Division",
      subdomain: "gaming",
      customDomain: "gaming-nvidia.com",
      dbName: "nvidia_db",
      status: "active",
      parentTenantId: nvidiaTenant.id,
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg", primaryColor: "#76B900" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000 } }
    },
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e66",
      name: "AI & Autonomous Systems",
      subdomain: "ai",
      customDomain: "ai-nvidia.com",
      dbName: "nvidia_db",
      status: "active",
      parentTenantId: nvidiaTenant.id,
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg", primaryColor: "#76B900" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000 } }
    },
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e77",
      name: "Mellanox Academy",
      subdomain: "mellanox",
      customDomain: "mellanox.com",
      dbName: "nvidia_db",
      status: "active",
      parentTenantId: nvidiaTenant.id,
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/93/Mellanox_logo_2019.png", primaryColor: "#00B4D8" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 500 } }
    }
  ]).onConflictDoNothing();

  await nvidiaClient.end();

  // Seed schemas inside nvidia_db
  await seedTenantSchemaFromSource(nvidiaDbUrl, "tenant_nvidia", nvidiaTenant.id, "nvidia", "NVIDIA Parent", "vt");
  await seedTenantSchemaFromSource(nvidiaDbUrl, "tenant_gaming", "019915ce-3b05-4db3-a1c0-365f772f4e55", "gaming", "Gaming Org Schema", "intel");
  await seedTenantSchemaFromSource(nvidiaDbUrl, "tenant_ai", "019915ce-3b05-4db3-a1c0-365f772f4e66", "ai", "AI Research Schema", "amd");
  await seedTenantSchemaFromSource(nvidiaDbUrl, "tenant_mellanox", "019915ce-3b05-4db3-a1c0-365f772f4e77", "mellanox", "Mellanox Schema", "intel");

  // Seed NVIDIA Owner in nvidia_db tenant_nvidia schema
  {
    const nvOwnerClient = postgres(nvidiaDbUrl, { max: 1 });
    const pwHash = await bcrypt.hash("Password123", 10);
    await nvOwnerClient.unsafe(`SET search_path TO "tenant_nvidia", public`);
    await nvOwnerClient.unsafe(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $3, role = $6
    `, [nvidiaTenant.id, "owner@nvidia.com", pwHash, "NVIDIA", "Owner", "Owner", "active"]);
    await nvOwnerClient.end();
  }

  // ==========================================
  // PROVISIONING DATABASE 2: test1_db (Test Organization parent + sub-tenants)
  // ==========================================
  const test1DbUrl = getDbUrl("test1_db");
  console.log("\n📦 [DATABASE: test1_db] Provisioning...");
  await runMigrations(test1DbUrl, "public", false);

  const test1Client = postgres(test1DbUrl, { max: 1 });
  const test1Db = drizzle(test1Client, { schema });

  // Seed Test1 Central Registry Records
  await test1Db.insert(schema.tenants).values({
    id: "96652527-1198-4bbb-8bc4-30781efaed18",
    name: "Wysbryx Platform",
    subdomain: "wysbryx",
    customDomain: "wysbryx.com",
    dbName: "vt_db",
    status: "active",
    branding: { logoUrl: "https://www.wysbryx.com/wysbryx_v.png", primaryColor: "#f97316" },
    settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000, maxCourses: 1000 } }
  }).onConflictDoNothing();

  const [test1Tenant] = await test1Db.insert(schema.tenants).values({
    id: "15b66b68-2e97-4bad-b756-e4cc16923530", // Match to TSMC
    name: "Test Organization parent",
    subdomain: "test1",
    customDomain: "test1-org.com",
    dbName: "test1_db",
    parentTenantId: wysbryxTenant.id,
    status: "active",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/TSMC_logo.svg", primaryColor: "#333333" },
    settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 100 } }
  }).returning();

  const [test1SubTenant] = await test1Db.insert(schema.tenants).values({
    id: "019915ce-3b05-4db3-a1c0-365f772f4e11", // Match to Nvidia
    name: "Test Sub-company",
    subdomain: "test1-sub",
    customDomain: "test1-sub.com",
    dbName: "test1_db",
    status: "active",
    parentTenantId: test1Tenant.id,
    branding: { logoUrl: "", primaryColor: "#555555" },
    settings: { features: { enableLibrary: false }, gateways: { stripe: false }, restrictions: { maxUsers: 50 } }
  }).returning();

  await test1Client.end();

  // Seed schemas inside test1_db
  await seedTenantSchemaFromSource(test1DbUrl, "tenant_test1", test1Tenant.id, "test1", "Test Org", "tsmc");
  await seedTenantSchemaFromSource(test1DbUrl, "tenant_test1_sub", test1SubTenant.id, "test1-sub", "Test Sub", "amd");

  // Seed SuperAdmin + Owner users into tenant_test1 parent schema (ON CONFLICT skip if already seeded)
  console.log("👤 Seeding SuperAdmin + Owner users into tenant_test1 schema...");
  {
    const saClient2 = postgres(test1DbUrl, { max: 1 });
    const passwordHash2 = await bcrypt.hash("Password123", 10);
    await saClient2.unsafe(`SET search_path TO "tenant_test1", public`);
    // SuperAdmin
    await saClient2.unsafe(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $3, role = $6
    `, [test1Tenant.id, "superadmin@test1.com", passwordHash2, "Test Org", "Super Admin", "SuperAdmin", "active"]);
    // Owner
    await saClient2.unsafe(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = $3, role = $6
    `, [test1Tenant.id, "owner@test1.lms.com", passwordHash2, "Test1", "Owner", "Owner", "active"]);
    await saClient2.end();
    console.log("   └─ SuperAdmin + Owner seeded in tenant_test1.");
  }

  // ==========================================
  // PROVISIONING CENTRAL REGISTRY: lms_coe_db
  // ==========================================
  const defaultDbUrl = getDbUrl(defaultDbName);
  console.log(`\n📦 [DATABASE: ${defaultDbName}] Provisioning central registry...`);
  await runMigrations(defaultDbUrl, "public", false);

  const defaultClientConn = postgres(defaultDbUrl, { max: 1 });
  const defaultDb = drizzle(defaultClientConn, { schema });

  // Seed all tenants into the central registry database
  await defaultDb.insert(schema.tenants).values([
    {
      id: "96652527-1198-4bbb-8bc4-30781efaed17",
      name: "Virginia Tech",
      subdomain: "vt",
      customDomain: "vt-lms.edu",
      dbName: "vt_db",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed18",
      status: "active",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Virginia_Tech_Gobblers_logo.svg", primaryColor: "#861F41" },
      settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 500, maxCourses: 100 } }
    },
    {
      id: "96652527-1198-4bbb-8bc4-30781efaed18",
      name: "Wysbryx Platform",
      subdomain: "wysbryx",
      customDomain: "wysbryx.com",
      dbName: "vt_db",
      status: "active",
      branding: { logoUrl: "https://www.wysbryx.com/wysbryx_v.png", primaryColor: "#f97316" },
      settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000, maxCourses: 1000 } }
    },
    {
      id: "03e6d706-6e79-4dc5-96c1-e10f1beff95c",
      name: "Intel Semiconductor Academy",
      subdomain: "intel",
      customDomain: "intel-academy.com",
      dbName: "vti_db",
      status: "active",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed17",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg", primaryColor: "#0068B5" },
      settings: { features: { enableLibrary: true, enablePlacement: true }, gateways: { stripe: true }, restrictions: { maxUsers: 200 } }
    },
    {
      id: "8c1598f4-6e79-4dc5-96c1-e10f1beff95c",
      name: "Intel Oregon Labs",
      subdomain: "intel-oregon",
      customDomain: "intel-oregon.com",
      dbName: "vti_db",
      status: "active",
      parentTenantId: "03e6d706-6e79-4dc5-96c1-e10f1beff95c",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg", primaryColor: "#0068B5" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 100 } }
    },
    {
      id: "4491103f-37e0-44bd-9458-acde5af99a18",
      name: "AMD Training Center",
      subdomain: "amd",
      customDomain: "amd-coe.com",
      dbName: "vti_db",
      status: "active",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed17",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg", primaryColor: "#ED1C24" },
      settings: { features: { enableLibrary: true, enablePlacement: false }, gateways: { stripe: true }, restrictions: { maxUsers: 150 } }
    },
    {
      id: "96652527-1198-4bbb-8bc4-30781efaed19",
      name: "VTI Enterprise",
      subdomain: "vti",
      customDomain: "vti-lms.com",
      dbName: "vti_db",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed18",
      status: "active",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Virginia_Tech_Gobblers_logo.svg", primaryColor: "#861F41" },
      settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 2000, maxCourses: 200 } }
    },
    {
      id: "96652527-1198-4bbb-8bc4-30781efaed20",
      name: "NVIDIA Corporation",
      subdomain: "nvidia",
      customDomain: "nvidia-lms.com",
      dbName: "nvidia_db",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed18",
      status: "active",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg", primaryColor: "#76B900" },
      settings: { features: { enableLibrary: true, enablePlacement: true, enableProctoring: true }, gateways: { stripe: true }, restrictions: { maxUsers: 5000, maxCourses: 500 } }
    },
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e55",
      name: "Gaming Division",
      subdomain: "gaming",
      customDomain: "gaming-nvidia.com",
      dbName: "nvidia_db",
      status: "active",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed20",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg", primaryColor: "#76B900" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000 } }
    },
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e66",
      name: "AI & Autonomous Systems",
      subdomain: "ai",
      customDomain: "ai-nvidia.com",
      dbName: "nvidia_db",
      status: "active",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed20",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg", primaryColor: "#76B900" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000 } }
    },
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e99",
      name: "Qualcomm Institute",
      subdomain: "qualcomm",
      customDomain: "qualcomm.com",
      dbName: "vti_db",
      status: "active",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed19",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Qualcomm-Logo.svg", primaryColor: "#3253DC" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 500 } }
    },
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e77",
      name: "Mellanox Networking",
      subdomain: "mellanox",
      customDomain: "mellanox-nvidia.com",
      dbName: "nvidia_db",
      status: "active",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed20",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg", primaryColor: "#76B900" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 1000 } }
    },
    {
      id: "15b66b68-2e97-4bad-b756-e4cc16923530",
      name: "Test Organization parent",
      subdomain: "test1",
      customDomain: "test1-org.com",
      dbName: "test1_db",
      parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed18",
      status: "active",
      branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/TSMC_logo.svg", primaryColor: "#333333" },
      settings: { features: { enableLibrary: true }, gateways: { stripe: true }, restrictions: { maxUsers: 100 } }
    },
    {
      id: "019915ce-3b05-4db3-a1c0-365f772f4e11",
      name: "Test Sub-company",
      subdomain: "test1-sub",
      customDomain: "test1-sub.com",
      dbName: "test1_db",
      status: "active",
      parentTenantId: "15b66b68-2e97-4bad-b756-e4cc16923530",
      branding: { logoUrl: "", primaryColor: "#555555" },
      settings: { features: { enableLibrary: false }, gateways: { stripe: false }, restrictions: { maxUsers: 50 } }
    }
  ]).onConflictDoNothing();
  await defaultClientConn.end();
  console.log(`   └─ Central registry database seeded with all tenants.`);

  console.log("\n🌟 [POSTGRES SEED] Hybrid Multi-Database & Schema Architecture Provisioned!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
