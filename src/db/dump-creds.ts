import postgres from "postgres";
import * as path from "path";
import * as fs from "fs";

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

const dbUrl = process.env.DATABASE_URL || "postgresql://coe_admin:SecretPassword123@127.0.0.1:5433/postgres";

async function dumpAllCredentials() {
  const dbs = ["vti_db", "nvidia_db", "vt_db", "test1_db"];
  
  console.log("\n==========================================================================================");
  console.log("                         MULTI-TENANT USER CREDENTIALS CATALOG                           ");
  console.log("==========================================================================================");

  for (const dbName of dbs) {
    const url = new URL(dbUrl);
    url.pathname = `/${dbName}`;
    const client = postgres(url.toString(), { max: 1 });

    try {
      const schemas = await client.unsafe(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
        ORDER BY schema_name ASC
      `);

      for (const s of schemas) {
        const schemaName = s.schema_name;
        try {
          const users = await client.unsafe(`
            SELECT email, role, first_name, last_name, status 
            FROM "${schemaName}".users 
            ORDER BY role DESC, email ASC
          `);
          
          if (users.length > 0) {
            console.log(`\n🗄  DATABASE: [${dbName}]  |  📂 SCHEMA: ["${schemaName}"]  (Total Users: ${users.length})`);
            console.log("------------------------------------------------------------------------------------------");
            users.forEach((u: any) => {
              console.log(`  • Role: ${u.role.padEnd(16)} | Email: ${u.email.padEnd(35)} | Name: ${u.first_name} ${u.last_name}`);
            });
          }
        } catch (e) {
          // Table doesn't exist in schema
        }
      }
    } catch (e: any) {
      console.error(`Failed to query DB ${dbName}:`, e.message);
    } finally {
      await client.end();
    }
  }
  console.log("\n==========================================================================================\n");
  process.exit(0);
}

dumpAllCredentials();
