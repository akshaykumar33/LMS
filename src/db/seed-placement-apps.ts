/**
 * Seed placement applications for all intel (and other leaf tenant) jobs.
 * Run with: npx tsx src/db/seed-placement-apps.ts
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const DB_PATH = path.resolve(process.cwd(), "db.json");

if (!fs.existsSync(DB_PATH)) {
  console.error(`db.json not found at ${DB_PATH}`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

const LEAF_SUBDOMAINS = ["intel", "amd", "tsmc", "mellanox", "qualcomm"];

// Statuses to cycle through for variety
const STATUSES = ["applied", "applied", "interviewing", "interviewing", "offered", "rejected", "selected"];

// Realistic resume URLs
const RESUME_URLS = [
  "https://drive.google.com/file/d/resume-semiconductor-engineer-01/view",
  "https://drive.google.com/file/d/resume-vlsi-designer-02/view",
  "https://drive.google.com/file/d/resume-process-engineer-03/view",
  "https://drive.google.com/file/d/resume-verification-engineer-04/view",
  "https://drive.google.com/file/d/resume-eda-automation-05/view",
  "https://drive.google.com/file/d/resume-physical-design-06/view",
  "https://drive.google.com/file/d/resume-chip-design-intern-07/view",
];

let totalAdded = 0;

for (const sub of LEAF_SUBDOMAINS) {
  const tenant = db.tenants.find((t: any) => t.subdomain === sub);
  if (!tenant) {
    console.log(`Tenant "${sub}" not found, skipping.`);
    continue;
  }

  const tenantJobs: any[] = db.job_postings.filter((j: any) => j.tenantId === tenant.id);
  const tenantStudents: any[] = db.students.filter((s: any) => s.tenantId === tenant.id);

  if (tenantJobs.length === 0 || tenantStudents.length === 0) {
    console.log(`  Skipping "${sub}": ${tenantJobs.length} jobs, ${tenantStudents.length} students`);
    continue;
  }

  console.log(`\nProcessing "${sub}" — ${tenantJobs.length} jobs, ${tenantStudents.length} students`);

  let added = 0;

  for (let si = 0; si < tenantStudents.length; si++) {
    const student = tenantStudents[si];

    // Each student applies to 2-4 jobs (not all, so there's realistic spread)
    const jobsToApply = tenantJobs.slice(0, Math.min(tenantJobs.length, 3 + (si % 2)));

    for (let ji = 0; ji < jobsToApply.length; ji++) {
      const job = jobsToApply[ji];

      // Skip if this application already exists
      const alreadyApplied = db.job_applications.some(
        (a: any) => a.studentId === student.id && a.jobId === job.id
      );
      if (alreadyApplied) continue;

      // Pick status and resume in a varied but deterministic way
      const statusIdx = (si * 3 + ji) % STATUSES.length;
      const resumeIdx = (si + ji) % RESUME_URLS.length;

      // Stagger application dates across the past few weeks
      const daysAgo = 5 + ((si * 7 + ji * 3) % 30);
      const appliedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      db.job_applications.push({
        id: randomUUID(),
        tenantId: tenant.id,
        studentId: student.id,
        jobId: job.id,
        resumeUrl: RESUME_URLS[resumeIdx],
        status: STATUSES[statusIdx],
        createdAt: appliedAt,
        updatedAt: appliedAt,
      });

      added++;
    }
  }

  // Summary per job
  for (const job of tenantJobs) {
    const count = db.job_applications.filter((a: any) => a.jobId === job.id).length;
    console.log(`  [${count} apps] ${job.title}`);
  }

  console.log(`  → Added ${added} new applications for "${sub}"`);
  totalAdded += added;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
console.log(`\nDone. Added ${totalAdded} total applications across all tenants.`);
