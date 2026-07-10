import postgres from "postgres";

const connectionString = "postgresql://coe_admin:SecretPassword123@127.0.0.1:5433/vt_db";

async function main() {
  const sql = postgres(connectionString);

  console.log("--- USERS IN tenant_intel ---");
  const intelUsers = await sql`SELECT id, first_name, last_name, email, role, status FROM tenant_intel.users`;
  console.log(intelUsers);

  console.log("--- USERS IN tenant_amd ---");
  const amdUsers = await sql`SELECT id, first_name, last_name, email, role, status FROM tenant_amd.users`;
  console.log(amdUsers);

  await sql.end();
}

main().catch(console.error);
