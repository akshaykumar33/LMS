import { db } from "@/db/db";
import { students, tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("=== TENANTS ===");
  const allTenants = await db.select().from(tenants);
  for (const t of allTenants) {
    console.log(`Tenant: id=${t.id}, subdomain=${t.subdomain}, name=${t.name}`);
  }

  console.log("\n=== STUDENTS ===");
  const allStudents = await db.select().from(students);
  console.log(`Total students: ${allStudents.length}`);
  if (allStudents.length > 0) {
    const s = allStudents[0];
    console.log(`First student: id=${s.id}, tenantId=${s.tenantId}, userId=${s.userId}`);
  }

  console.log("\n=== USERS ===");
  const allUsers = await db.select().from(users);
  console.log(`Total users: ${allUsers.length}`);
}

run().catch(console.error);
