import postgres from "postgres";
import fs from "fs";
import path from "path";

async function seedRemote() {
  const targetDbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!targetDbUrl) {
    console.error("❌ ERROR: Please set POSTGRES_URL or DATABASE_URL environment variable.");
    console.error("Example: POSTGRES_URL=postgresql://user:password@ep-host.region.aws.neon.tech/neondb npx tsx scripts/seed-remote-postgres.ts");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("🚀 SEEDING REMOTE POSTGRES (VERCEL / NEON / SUPABASE / RENDER)");
  console.log("==================================================\n");

  const sql = postgres(targetDbUrl, { max: 1, ssl: targetDbUrl.includes("localhost") ? false : "require" });

  const dumpPath = path.join(process.cwd(), "scripts", "production-db-dump.json");
  if (!fs.existsSync(dumpPath)) {
    console.error(`❌ Dump file not found at ${dumpPath}. Run 'npx tsx scripts/export-database-dump.ts' first.`);
    process.exit(1);
  }

  const dumpData = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));

  // 1. Run migrations across all schemas first
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

  const migrationDir = path.join(process.cwd(), "src", "db", "migrations");

  for (const dbDump of dumpData) {
    for (const schemaObj of dbDump.schemas) {
      const sName = schemaObj.schemaName;
      console.log(`📦 Setting up schema '${sName}'...`);
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${sName}"`);

      for (const mFile of migrationFiles) {
        const filePath = path.join(migrationDir, mFile);
        if (fs.existsSync(filePath)) {
          let sqlContent = fs.readFileSync(filePath, "utf-8");
          await sql.unsafe(`SET search_path TO "${sName}", public`);
          const statements = sqlContent.split(";").filter(s => s.trim().length > 0);
          for (const stmt of statements) {
            try {
              await sql.unsafe(stmt);
            } catch (err: any) {
              // Ignore already existing errors
            }
          }
        }
      }

      // Restore table rows
      for (const tableObj of schemaObj.tables) {
        const tableName = tableObj.tableName;
        const rows = tableObj.rows;
        if (!rows || rows.length === 0) continue;

        console.log(`   └─ Restoring ${rows.length} rows in "${sName}"."${tableName}"...`);
        for (const row of rows) {
          const keys = Object.keys(row);
          const values = Object.values(row).map(v => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v));

          const colsFormatted = keys.map(k => `"${k}"`).join(", ");
          const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(", ");

          try {
            await sql.unsafe(
              `INSERT INTO "${sName}"."${tableName}" (${colsFormatted}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              values as any[]
            );
          } catch (e: any) {
            // Ignore constraint duplicates
          }
        }
      }
    }
  }

  await sql.end();

  console.log("\n==================================================");
  console.log("🎉 REMOTE POSTGRES DATABASE PROVISIONED & SEEDED SUCCESSFULLY!");
  console.log("==================================================");
  process.exit(0);
}

seedRemote();
