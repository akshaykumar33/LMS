import { db, dbSubdomainStorage } from "../src/db/db";
import { courses, subjectiveSubmissions, batchSessions } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function testFacultyPageData() {
  console.log("🔍 Testing Faculty page query for subdomain 'intel'...");

  try {
    const result = await dbSubdomainStorage.run("intel", async () => {
      // 1. Fetch courses
      const coursesList = await db.query.courses.findMany({
        orderBy: [courses.code],
        with: {
          modules: {
            with: {
              lessons: true,
            },
          },
        },
      });

      // 2. Fetch subjective submissions
      const subList = await db.query.subjectiveSubmissions.findMany({
        orderBy: (ss: any, { desc }: any) => [desc(ss.submittedAt)],
        with: {
          course: true,
          lesson: true,
          student: {
            with: {
              user: true,
            },
          },
        },
      });

      return { coursesCount: coursesList.length, subCount: subList.length };
    });

    console.log("✅ Faculty page queries SUCCESS! Result:", result);
  } catch (err: any) {
    console.error("❌ Faculty page queries FAILED:", err?.message || err);
    process.exit(1);
  }

  process.exit(0);
}

testFacultyPageData();
