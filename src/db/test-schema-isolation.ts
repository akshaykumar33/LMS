import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import * as fs from "fs";
import * as path from "path";

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

const connectionStringBase = process.env.DATABASE_URL;
if (!connectionStringBase) {
  throw new Error("DATABASE_URL environment variable is required.");
}

const getDatabaseForSubdomain = (subdomain: string): string => {
  const s = subdomain.toLowerCase();
  if (s === "test1" || s === "test1-sub") {
    return "test1_db";
  }
  if (s === "vt" || s === "intel" || s === "intel-oregon" || s === "amd") {
    return "vt_db";
  }
  return "postgres";
};

const getDbUrl = (dbName: string) => {
  const url = new URL(connectionStringBase);
  url.pathname = `/${dbName}`;
  return url.toString();
};

async function runTest() {
  console.log("🔍 [HYBRID ISOLATION TEST] Initiating verification...");

  const subdomainsToTest = [
    { sub: "vt", label: "Virginia Tech (Parent) in [vt_db]" },
    { sub: "intel", label: "Intel Semiconductor Academy (Sub-tenant) in [vt_db]" },
    { sub: "intel-oregon", label: "Intel Oregon Labs (Sub-company) in [vt_db]" },
    { sub: "amd", label: "AMD Training Center (Sub-tenant) in [vt_db]" },
    { sub: "test1", label: "Test Organization (Parent) in [test1_db]" },
    { sub: "test1-sub", label: "Test Sub-company (Sub-tenant) in [test1_db]" }
  ];

  console.log("\n--- VERIFYING HYBRID MULTI-DATABASE & SCHEMA DATA SEGREGATION ---\n");

  for (const item of subdomainsToTest) {
    const dbName = getDatabaseForSubdomain(item.sub);
    const dbUrl = getDbUrl(dbName);
    const client = postgres(dbUrl, { max: 1 });
    const db = drizzle(client, { schema });

    const schemaName = `tenant_${item.sub.replace("-", "_")}`;
    console.log(`📡 Querying subdomain "${item.sub}" -> DB: "${dbName}" | Schema: "${schemaName}"`);
    
    try {
      // Set the search path inside this connection pool
      await db.execute(sql.raw(`SET search_path TO "${schemaName}", public`));

      // 1. Fetch Users in the active schema
      const users = await db.select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        role: schema.users.role,
      }).from(schema.users);

      // 2. Fetch Courses in the active schema
      const courses = await db.select({
        id: schema.courses.id,
        code: schema.courses.code,
        name: schema.courses.name,
      }).from(schema.courses);

      // 3. Fetch Tenant Settings from the central registry (public.tenants)
      const tenantDetails = await db.execute(sql`
        SELECT name, subdomain, custom_domain 
        FROM public.tenants 
        WHERE subdomain = ${item.sub}
      `);

      console.log(`   🏢 Tenant Name: ${tenantDetails[0]?.name || "N/A"} (${tenantDetails[0]?.custom_domain || "N/A"})`);
      console.log(`   👤 Users Seeded: ${users.length}`);
      users.forEach(u => {
        console.log(`      - [Role: ${u.role}] ${u.firstName} ${u.lastName} (${u.email})`);
      });
      console.log(`   📚 Courses Seeded: ${courses.length}`);
      courses.forEach(c => {
        console.log(`      - [${c.code}] ${c.name}`);
      });

    } catch (e: any) {
      console.error(`   ❌ Failed to query ${item.sub}:`, e.message);
    } finally {
      await client.end();
    }
    console.log("--------------------------------------------------\n");
  }

  process.exit(0);
}

runTest().catch(err => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
