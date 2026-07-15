import { db } from "./db";
import { users, tenants, roles } from "./schema";
import { eq, inArray } from "drizzle-orm";

async function run() {
  const targetSubdomains = ["amd", "tsmc", "mellanox", "qualcomm"];
  const listTenants = await db.select().from(tenants).where(inArray(tenants.subdomain, targetSubdomains));
  for (const t of listTenants) {
    const listUsers = await db.select().from(users).where(eq(users.tenantId, t.id));
    console.log(`\n======================================================`);
    console.log(`Tenant: ${t.subdomain} - UsersCount: ${listUsers.length}`);
    console.log(`======================================================`);
    for (const u of listUsers) {
      let roleName = "N/A";
      if (u.customRoleId) {
        const [r] = await db.select().from(roles).where(eq(roles.id, u.customRoleId));
        roleName = r ? r.name : "Role not found!";
      }
      console.log(`Email: ${u.email.padEnd(45)} | Role: ${u.role.padEnd(20)} | customRoleId: ${String(u.customRoleId).padEnd(36)} | Resolved: ${roleName}`);
    }
  }
}

run().catch(console.error);
