import { db } from "./db";
import { batches, tenants } from "./schema";
import { eq, and, sql } from "drizzle-orm";

async function run() {
  const allTenants = await db.select().from(tenants);
  for (const t of allTenants) {
    const list = await db.query.batches.findMany({
      where: and(
        eq(batches.tenantId, t.id),
        sql`${batches.deletedAt} IS NULL`
      ),
    });
    console.log(`Tenant: ${t.subdomain} (${t.name}) - ID: ${t.id} - Batches: ${list.length}`);
    for (const b of list) {
      console.log(`  Batch: id=${b.id}, name=${b.name}, deletedAt=${b.deletedAt}`);
    }
  }
}

run().catch(console.error);
