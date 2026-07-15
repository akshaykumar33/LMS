import { db } from "./db";
import { tenants } from "./schema";

async function run() {
  const allTenants = await db.select().from(tenants);
  console.log(`Total Tenants in Database: ${allTenants.length}`);
  for (const t of allTenants) {
    console.log(`Subdomain: ${t.subdomain.padEnd(12)} | Name: ${t.name.padEnd(35)} | ID: ${t.id} | Parent: ${t.parentTenantId}`);
  }
}

run().catch(console.error);
