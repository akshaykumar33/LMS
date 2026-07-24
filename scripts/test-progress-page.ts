import { db, dbSubdomainStorage } from "../src/db/db";
import { AnalyticsRepository } from "../src/features/analytics/repository/analytics-repository";
import { students } from "../src/db/schema";

async function testProgressPageQueries() {
  console.log("==================================================");
  console.log("🧪 TESTING PROGRESS PAGE & GAMIFICATION QUERIES");
  console.log("==================================================\n");

  const testSubdomains = ["intel", "amd", "gaming", "ai", "mellanox", "test1", "test1-sub"];

  for (const sub of testSubdomains) {
    try {
      const res = await dbSubdomainStorage.run(sub, async () => {
        const student = await db.query.students.findFirst();
        if (!student) {
          return { status: "no_student" };
        }
        const gami = await AnalyticsRepository.getStudentGamification(student.id);
        return { status: "success", xp: gami.xp, level: gami.level };
      });
      console.log(`✅ [PASS] Subdomain '${sub}' getStudentGamification SUCCESS:`, res);
    } catch (err: any) {
      console.error(`❌ [FAILED] Subdomain '${sub}' getStudentGamification FAILED:`, err?.message || err);
    }
  }

  process.exit(0);
}

testProgressPageQueries();
