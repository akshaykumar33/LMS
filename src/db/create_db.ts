import postgres from "postgres";

const defaultUrl = "postgresql://postgres:postgres123@localhost:5432/postgres";
const targetDb = "lms_coe_db";

async function run() {
  console.log("Connecting to default PostgreSQL database to verify target database...");
  const sql = postgres(defaultUrl);

  try {
    const dbs = await sql`SELECT datname FROM pg_database WHERE datname = ${targetDb}`;
    
    if (dbs.length === 0) {
      console.log(`Database '${targetDb}' does not exist. Creating...`);
      await sql`CREATE DATABASE lms_coe_db`;
      console.log(`Database '${targetDb}' successfully created!`);
    } else {
      console.log(`Database '${targetDb}' already exists. Proceeding.`);
    }
  } catch (error) {
    console.error("Error checking or creating database:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
