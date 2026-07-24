import { db, dbSubdomainStorage } from "../src/db/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function verifyAllCredentials() {
  console.log("==================================================");
  console.log("🧪 TESTING ALL CREDENTIALS ACROSS ALL DBs & SCHEMAS");
  console.log("==================================================\n");

  const testAccounts = [
    // 🌐 1. Platform Level (Wysbryx Super Admin)
    { label: "Wysbryx Super Admin", email: "superadmin@wysbryx.com", expectedSubdomain: "wysbryx", expectedRole: "SuperAdmin" },

    // 🏢 2. Parent Enterprise 1: VTI Enterprise (vti_db)
    { label: "VTI Parent Owner", email: "owner@vti.com", expectedSubdomain: "vti", expectedRole: "Owner" },
    { label: "Intel Child Admin", email: "admin@intel.lms.com", expectedSubdomain: "intel", expectedRole: "Admin" },
    { label: "Intel Faculty", email: "faculty1@intel.lms.com", expectedSubdomain: "intel", expectedRole: "Faculty" },
    { label: "Intel Student", email: "student1@student.intel.com", expectedSubdomain: "intel", expectedRole: "Student" },
    { label: "AMD Child Admin", email: "admin@amd.lms.com", expectedSubdomain: "amd", expectedRole: "Admin" },
    { label: "AMD Faculty", email: "faculty1@amd.lms.com", expectedSubdomain: "amd", expectedRole: "Faculty" },
    { label: "AMD Student", email: "student1@student.amd.com", expectedSubdomain: "amd", expectedRole: "Student" },
    { label: "Qualcomm Child Admin", email: "admin@qualcomm.lms.com", expectedSubdomain: "qualcomm", expectedRole: "Admin" },

    // 💚 3. Parent Enterprise 2: NVIDIA Corporation (nvidia_db)
    { label: "NVIDIA Parent Owner", email: "owner@nvidia.com", expectedSubdomain: "nvidia", expectedRole: "Owner" },
    { label: "Gaming Child Admin", email: "admin@gaming.lms.com", expectedSubdomain: "gaming", expectedRole: "Admin" },
    { label: "Gaming Faculty", email: "faculty1@gaming.lms.com", expectedSubdomain: "gaming", expectedRole: "Faculty" },
    { label: "Gaming Student", email: "student1@student.gaming.com", expectedSubdomain: "gaming", expectedRole: "Student" },
    { label: "AI Systems Admin", email: "admin@ai.lms.com", expectedSubdomain: "ai", expectedRole: "Admin" },
    { label: "AI Systems Faculty", email: "faculty1@ai.lms.com", expectedSubdomain: "ai", expectedRole: "Faculty" },
    { label: "Mellanox Admin", email: "admin@mellanox.lms.com", expectedSubdomain: "mellanox", expectedRole: "Admin" },

    // 🧪 4. Enterprise 3: Test Organization (test1_db)
    { label: "Test1 Parent Owner", email: "owner@test1.lms.com", expectedSubdomain: "test1", expectedRole: "Owner" },
    { label: "Test1 Parent Admin", email: "admin@test1.lms.com", expectedSubdomain: "test1", expectedRole: "Admin" },
    { label: "Test1-Sub Child Owner", email: "owner@test1-sub.lms.com", expectedSubdomain: "test1-sub", expectedRole: "Owner" },
    { label: "Test1-Sub Child Admin", email: "admin@test1-sub.lms.com", expectedSubdomain: "test1-sub", expectedRole: "Admin" },
  ];

  let passed = 0;
  let failed = 0;

  for (const acct of testAccounts) {
    try {
      // Find account by searching in target subdomain
      const user = await dbSubdomainStorage.run(acct.expectedSubdomain, async () => {
        return await db.query.users.findFirst({
          where: eq(users.email, acct.email),
        });
      });

      if (!user) {
        console.error(`❌ [FAILED] ${acct.label} (${acct.email}) -> User not found in schema for subdomain '${acct.expectedSubdomain}'`);
        failed++;
        continue;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare("Password123", user.passwordHash);
      if (!isPasswordValid) {
        console.error(`❌ [FAILED] ${acct.label} (${acct.email}) -> Invalid password!`);
        failed++;
        continue;
      }

      // Verify account active status
      if (user.status !== "active") {
        console.error(`❌ [FAILED] ${acct.label} (${acct.email}) -> Account status is '${user.status}'`);
        failed++;
        continue;
      }

      console.log(`✅ [PASS] ${acct.label.padEnd(23)} | Email: ${acct.email.padEnd(30)} | Role: ${user.role.padEnd(10)} | Subdomain: ${acct.expectedSubdomain}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [ERROR] ${acct.label} (${acct.email}) -> Exception: ${err?.message || err}`);
      failed++;
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`📊 Credential Verification Results: ${passed} PASSED | ${failed} FAILED`);
  console.log("--------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

verifyAllCredentials();
