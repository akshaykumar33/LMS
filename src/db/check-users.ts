import { db } from "./db";
import { roles, tenants } from "./schema";
import { eq } from "drizzle-orm";

async function run() {
  const allTenants = await db.select().from(tenants);
  for (const t of allTenants) {
    const list = await db.select().from(roles).where(eq(roles.tenantId, t.id));
    console.log(`Tenant: ${t.subdomain} (${t.name}) - ID: ${t.id} - Roles: ${list.length}`);
    for (const r of list) {
      console.log(`  - Role: ${r.name} (id=${r.id})`);
    }
  }
}

run().catch(console.error);
