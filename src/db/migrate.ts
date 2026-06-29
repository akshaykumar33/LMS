import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./db";
import path from "path";

async function runMigrations() {
  console.log("⏳ Running database migrations...");
  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "src/db/migrations"),
    });
    console.log("✅ Database migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
