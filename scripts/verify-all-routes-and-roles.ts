import { db, dbSubdomainStorage } from "../src/db/db";
import { AnalyticsRepository } from "../src/features/analytics/repository/analytics-repository";
import {
  users,
  students,
  courses,
  batches,
  batchSessions,
  subjectiveSubmissions,
  lessonProgress,
  courseProgress,
  digitalLibrary,
  libraryAiContext,
  notifications,
  certificates,
  auditLogs
} from "../src/db/schema";
import { eq } from "drizzle-orm";

async function verifyAll() {
  console.log("==================================================");
  console.log("🔍 COMPREHENSIVE MULTI-TENANT DATABASE & ROUTE AUDIT");
  console.log("==================================================\n");

  const tenants = ["intel", "vti", "amd", "qualcomm", "gaming", "ai", "mellanox", "nvidia", "test1", "test1-sub", "wysbryx"];
  let totalErrors = 0;

  for (const t of tenants) {
    console.log(`\n--- Auditing Subdomain: '${t}' ---`);
    await dbSubdomainStorage.run(t, async () => {
      // 1. Check users
      try {
        const userList = await db.query.users.findMany({ limit: 5 });
        console.log(`  ✅ users query OK (${userList.length} rows)`);
      } catch (e: any) {
        console.error(`  ❌ users query FAILED:`, e.message);
        totalErrors++;
      }

      // 2. Check students
      try {
        const studentList = await db.query.students.findMany({
          with: { user: true, batch: true },
          limit: 5
        });
        console.log(`  ✅ students query OK (${studentList.length} rows)`);
        
        if (studentList.length > 0) {
          const sId = studentList[0].id;
          try {
            const gami = await AnalyticsRepository.getStudentGamification(sId);
            console.log(`  ✅ getStudentGamification OK (xp: ${gami.xp}, level: ${gami.level})`);
          } catch (e: any) {
            console.error(`  ❌ getStudentGamification FAILED:`, e.message);
            totalErrors++;
          }
        }
      } catch (e: any) {
        console.error(`  ❌ students query FAILED:`, e.message);
        totalErrors++;
      }

      // 3. Check courses & modules & lessons
      try {
        const courseList = await db.query.courses.findMany({
          with: { modules: { with: { lessons: true } } },
          limit: 5
        });
        console.log(`  ✅ courses query OK (${courseList.length} rows)`);
      } catch (e: any) {
        console.error(`  ❌ courses query FAILED:`, e.message);
        totalErrors++;
      }

      // 4. Check batches & batchSessions
      try {
        const sessionList = await db.query.batchSessions.findMany({
          with: { instructor: true },
          limit: 5
        });
        console.log(`  ✅ batchSessions query OK (${sessionList.length} rows)`);
      } catch (e: any) {
        console.error(`  ❌ batchSessions query FAILED:`, e.message);
        totalErrors++;
      }

      // 5. Check subjectiveSubmissions
      try {
        const subList = await db.query.subjectiveSubmissions.findMany({
          with: { lesson: true, student: { with: { user: true } }, course: true },
          limit: 5
        });
        console.log(`  ✅ subjectiveSubmissions query OK (${subList.length} rows)`);
      } catch (e: any) {
        console.error(`  ❌ subjectiveSubmissions query FAILED:`, e.message);
        totalErrors++;
      }

      // 6. Check digitalLibrary
      try {
        const libList = await db.query.digitalLibrary.findMany({ limit: 5 });
        console.log(`  ✅ digitalLibrary query OK (${libList.length} rows)`);
      } catch (e: any) {
        console.error(`  ❌ digitalLibrary query FAILED:`, e.message);
        totalErrors++;
      }

      // 7. Check notifications
      try {
        const notifList = await db.query.notifications.findMany({ limit: 5 });
        console.log(`  ✅ notifications query OK (${notifList.length} rows)`);
      } catch (e: any) {
        console.error(`  ❌ notifications query FAILED:`, e.message);
        totalErrors++;
      }

      // 8. Check certificates
      try {
        const certList = await db.query.certificates.findMany({ limit: 5 });
        console.log(`  ✅ certificates query OK (${certList.length} rows)`);
      } catch (e: any) {
        console.error(`  ❌ certificates query FAILED:`, e.message);
        totalErrors++;
      }
    });
  }

  console.log("\n==================================================");
  if (totalErrors === 0) {
    console.log("🎉 AUDIT COMPLETED WITH ZERO ERRORS ACROSS ALL TENANTS!");
  } else {
    console.log(`⚠️ AUDIT COMPLETED WITH ${totalErrors} ERRORS FOUND!`);
  }
  console.log("==================================================");

  process.exit(totalErrors === 0 ? 0 : 1);
}

verifyAll();
