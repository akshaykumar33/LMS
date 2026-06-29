import { writeFileSync } from "fs";
import { join } from "path";
import { db } from "./db";
import * as schema from "./schema";

async function main() {
  console.log("🌱 Starting export of PostgreSQL database to db.json...");
  const data: Record<string, any[]> = {};

  const tables = [
    { name: "tenants", schema: schema.tenants },
    { name: "roles", schema: schema.roles },
    { name: "permissions", schema: schema.permissions },
    { name: "role_permissions", schema: schema.rolePermissions },
    { name: "users", schema: schema.users },
    { name: "batches", schema: schema.batches },
    { name: "admission_applications", schema: schema.admissionApplications },
    { name: "admission_documents", schema: schema.admissionDocuments },
    { name: "admission_payments", schema: schema.admissionPayments },
    { name: "students", schema: schema.students },
    { name: "courses", schema: schema.courses },
    { name: "course_batches", schema: schema.courseBatches },
    { name: "modules", schema: schema.modules },
    { name: "lessons", schema: schema.lessons },
    { name: "quizzes", schema: schema.quizzes },
    { name: "quiz_questions", schema: schema.quizQuestions },
    { name: "quiz_attempts", schema: schema.quizAttempts },
    { name: "notifications", schema: schema.notifications },
    { name: "job_postings", schema: schema.jobPostings },
    { name: "job_applications", schema: schema.jobApplications },
    { name: "certificates", schema: schema.certificates },
    { name: "audit_logs", schema: schema.auditLogs },
  ];

  for (const table of tables) {
    console.log(`Reading table: ${table.name}...`);
    try {
      const records = await db.select().from(table.schema);
      data[table.name] = records;
      console.log(`  Read ${records.length} records.`);
    } catch (e: any) {
      console.error(`  Error reading ${table.name}:`, e.message);
    }
  }

  const outputPath = join(process.cwd(), "db.json");
  writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`✅ Successfully exported entire database to: ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Export failed:", e);
    process.exit(1);
  });
