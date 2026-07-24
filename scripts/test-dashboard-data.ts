import { db, dbSubdomainStorage } from "../src/db/db";
import { batchSessions } from "../src/db/schema";

async function testDashboardQueries() {
  console.log("==================================================");
  console.log("🧪 TESTING DASHBOARD BATCH_SESSIONS QUERY");
  console.log("==================================================\n");

  const subdomains = ["intel", "amd", "gaming", "ai", "mellanox", "test1", "test1-sub", "vti", "nvidia"];

  for (const sub of subdomains) {
    try {
      const res = await dbSubdomainStorage.run(sub, async () => {
        return await db.query.batchSessions.findMany({
          with: {
            instructor: true,
          },
        });
      });
      console.log(`✅ [PASS] Subdomain '${sub}' batchSessions query SUCCESS (${res.length} sessions)`);
    } catch (err: any) {
      console.error(`❌ [FAILED] Subdomain '${sub}' batchSessions query FAILED: ${err?.message || err}`);
    }
  }

  process.exit(0);
}

testDashboardQueries();
