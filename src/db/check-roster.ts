import { db } from "@/db/db";
import { FacultyRepository } from "@/features/faculty/repository/faculty-repository";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const intelTenant = await db.query.tenants.findFirst({
    where: eq(tenants.subdomain, "intel"),
  });
  if (!intelTenant) {
    console.error("Intel tenant not found.");
    return;
  }
  console.log("Intel Tenant ID:", intelTenant.id);

  const batches = await FacultyRepository.getTenantBatches(intelTenant.id);
  console.log(`Batches count: ${batches.length}`);
  if (batches.length === 0) return;

  const batch = batches[0];
  console.log(`First batch: id=${batch.id}, name=${batch.name}`);

  const roster = await FacultyRepository.getBatchRoster(intelTenant.id, batch.id);
  console.log(`Roster size: ${roster.length}`);
  if (roster.length > 0) {
    const student = roster[0];
    console.log("Roster first student:", student);

    // Try finding this student using getStudentProfileStats
    try {
      const stats = await FacultyRepository.getStudentProfileStats(intelTenant.id, student.studentId);
      console.log("SUCCESS! Student stats retrieved:", stats.student.id);
    } catch (err: any) {
      console.log("FAILED to retrieve student stats:", err.message);
    }
  }
}

run().catch(console.error);
