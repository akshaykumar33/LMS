import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const DB_PATH = path.resolve(process.cwd(), "db.json");

if (!fs.existsSync(DB_PATH)) {
  console.error(`db.json not found at ${DB_PATH}`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

// Standard password hash for "Password123"
const passwordHash = bcrypt.hashSync("Password123", 10);

const leafSubdomains = ["intel", "amd", "tsmc", "mellanox", "qualcomm"];

async function run() {
  console.log("Starting db.json enrichment...");

  // Ensure tables exist in db
  const tables = [
    "tenants", "roles", "users", "batches", "courses", "course_batches",
    "modules", "lessons", "quizzes", "quiz_questions", "quiz_attempts",
    "students", "digital_library", "job_postings", "job_applications",
    "notifications", "certificates", "projects", "project_submissions"
  ];

  for (const table of tables) {
    if (!db[table]) {
      db[table] = [];
    }
  }

  // Get Wysbryx ID and VT ID
  const wysbryx = db.tenants.find((t: any) => t.subdomain === "wysbryx");
  const vt = db.tenants.find((t: any) => t.subdomain === "vt");
  const nvidia = db.tenants.find((t: any) => t.subdomain === "nvidia");

  for (const sub of leafSubdomains) {
    const tenant = db.tenants.find((t: any) => t.subdomain === sub);
    if (!tenant) {
      console.log(`Tenant with subdomain "${sub}" not found. Skipping.`);
      continue;
    }

    console.log(`Enriching tenant: ${tenant.name} (${sub})`);

    // 1. Roles Check
    const roleNames = [
      "Owner", "Admin", "Program Manager", "Faculty", "Mentor", "Student", "Placement Officer", "Guest"
    ];
    const tenantRoles = db.roles.filter((r: any) => r.tenantId === tenant.id);
    const roleMap: Record<string, string> = {};

    for (const name of roleNames) {
      let existingRole = tenantRoles.find((r: any) => r.name === name);
      if (!existingRole) {
        const id = randomUUID();
        existingRole = {
          id,
          tenantId: tenant.id,
          name,
          description: `${name} role for ${tenant.name}`,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.roles.push(existingRole);
        console.log(`  + Created role: ${name} (id=${id})`);
      }
      roleMap[name] = existingRole.id;
    }

    // 2. Batches Check
    let tenantBatches = db.batches.filter((b: any) => b.tenantId === tenant.id);
    if (tenantBatches.length === 0) {
      const batchList = [
        {
          id: randomUUID(),
          tenantId: tenant.id,
          name: "VLSI Design & Architecture - 2026",
          description: "Specialized training on VLSI architecture, physical design, and verilog modeling.",
          capacity: 45,
          startDate: "2026-07-01T00:00:00.000Z",
          endDate: "2026-12-31T00:00:00.000Z",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          name: "Embedded Systems & IoT - Batch A",
          description: "Focus on RTOS, ARM microcontroller programming, and semiconductor hardware design.",
          capacity: 40,
          startDate: "2026-08-15T00:00:00.000Z",
          endDate: "2027-02-15T00:00:00.000Z",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          name: "RF Microelectronics & Testing",
          description: "Radio Frequency design, impedance matching, and high-frequency chip testing methodologies.",
          capacity: 30,
          startDate: "2026-09-01T00:00:00.000Z",
          endDate: "2027-03-01T00:00:00.000Z",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      db.batches.push(...batchList);
      tenantBatches = batchList;
      console.log(`  + Created 3 default batches.`);
    }

    // 3. Staff & Student Users Check
    const staffSpecs = [
      { prefix: "owner", role: "Owner", first: "System", last: "Owner" },
      { prefix: "admin", role: "Admin", first: "Sarah", last: "Admin" },
      { prefix: "manager", role: "Program Manager", first: "Michael", last: "Manager" },
      { prefix: "faculty1", role: "Faculty", first: "Prof. Alan", last: "Turing" },
      { prefix: "faculty2", role: "Faculty", first: "Dr. Grace", last: "Hopper" },
      { prefix: "mentor", role: "Mentor", first: "Steve", last: "Mentor" },
      { prefix: "placement", role: "Placement Officer", first: "Patricia", last: "Placement" },
      { prefix: "guest", role: "Guest", first: "Gordon", last: "Guest" },
      { prefix: "student", role: "Student", first: "Stewart", last: "Student" },
    ];

    const tenantUsers = db.users.filter((u: any) => u.tenantId === tenant.id);
    for (const spec of staffSpecs) {
      const email = `${spec.prefix}@${sub}.lms.com`;
      let user = tenantUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        user = {
          id: randomUUID(),
          tenantId: tenant.id,
          firstName: spec.first,
          lastName: spec.last,
          email,
          passwordHash,
          role: spec.role,
          customRoleId: roleMap[spec.role],
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.users.push(user);
        console.log(`  + Created user: ${email} (${spec.role})`);
      } else {
        // Enforce correct password hash and customRoleId
        user.passwordHash = passwordHash;
        user.customRoleId = roleMap[spec.role];
        console.log(`  ~ Updated user: ${email} with standard password and customRoleId`);
      }

      // If it's a student, ensure student profile exists
      if (spec.role === "Student") {
        let studentProfile = db.students.find((s: any) => s.userId === user.id);
        if (!studentProfile) {
          studentProfile = {
            id: randomUUID(),
            tenantId: tenant.id,
            userId: user.id,
            batchId: tenantBatches[0].id,
            rollNumber: `ME-${sub.toUpperCase()}-26-${Math.floor(1000 + Math.random() * 9000)}`,
            admissionNumber: `ADM-${sub.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          db.students.push(studentProfile);
          console.log(`  + Created student profile for ${email}`);
        }
      }
    }

    // 4. Job Postings Check
    let tenantJobs = db.job_postings.filter((j: any) => j.tenantId === tenant.id);
    if (tenantJobs.length === 0) {
      const companyName = tenant.branding?.companyName || tenant.name;
      const jobs = [
        {
          id: randomUUID(),
          tenantId: tenant.id,
          title: "Silicon Verification Engineer",
          company: companyName,
          description: "Join the core design validation team. You will write UVM testbenches, run coverage-driven metrics, and verify sub-system blocks.",
          requirements: "Solid understanding of SystemVerilog, UVM, and assertion-based validation protocols. Experience with Synopsys VCS or Siemens Questa.",
          salary: "$110,000 - $135,000",
          location: "Austin, TX / San Jose, CA / Bangalore, IN",
          isActive: true,
          type: "job",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          title: "Physical Design & Layout Engineer",
          company: companyName,
          description: "Responsible for floorplanning, clock tree synthesis (CTS), routing, and DRC/LVS physical sign-off at advanced nodes.",
          requirements: "Hands-on experience with Cadence Innovus or Synopsys ICC2. Knowledge of RC parasitics extraction and electro-migration limits.",
          salary: "$115,000 - $140,000",
          location: "San Jose, CA / Hsinchu, TW / Bangalore, IN",
          isActive: true,
          type: "job",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          title: "Semiconductor Process Intern",
          company: companyName,
          description: "Support engineers in microarchitecture layout review, physical design simulation, and cleanroom test execution.",
          requirements: "Basic knowledge of Verilog/VHDL, logic gates, and Python/Tcl scripting. Pursuing a degree in Electrical/Electronics Engineering.",
          salary: "$3,500 / month",
          location: "Hillsboro, OR / San Jose, CA / Bangalore, IN",
          isActive: true,
          type: "internship",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          title: "EDA CAD Automation Engineer",
          company: companyName,
          description: "Develop, maintain, and support software tool scripts (Tcl, Python, Perl) automating chip physical design and timing closure workflows.",
          requirements: "Proficient in Python/Tcl scripting and experience using Synopsys or Cadence design environments.",
          salary: "$105,000 - $125,000",
          location: "San Jose, CA / Austin, TX",
          isActive: true,
          type: "job",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      db.job_postings.push(...jobs);
      tenantJobs = jobs;
      console.log(`  + Created 4 job openings.`);
    }

    // 5. Digital Library Check
    const tenantLibrary = db.digital_library.filter((l: any) => l.tenantId === tenant.id);
    if (tenantLibrary.length === 0) {
      const libraryAssets = [
        {
          id: randomUUID(),
          tenantId: tenant.id,
          title: "CMOS VLSI Design Lecture Handbook",
          author: "Neil Weste & David Harris",
          description: "The reference guide covering CMOS transistor design, VLSI layouts, cell library configurations, and timing optimizations.",
          fileUrl: "https://inst.eecs.berkeley.edu/~ee241/sp06/lectures/weste.pdf",
          category: "book",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          title: "FinFET Device Physics and Chapter 1 Modeling",
          author: "J.P. Colinge",
          description: "An advanced research chapter detailing 3D multi-gate structure controls, sub-threshold leakage, and electrostatic gate tuning.",
          fileUrl: "https://www.eetimes.com/wp-content/uploads/media/1179720/finfet_book_ch1.pdf",
          category: "book",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          title: "Sub-3nm Gate-All-Around (GAA) Transistor Performance Study",
          author: "Dr. Grace Hopper, Steve Mentor",
          description: "A research publication investigating structural parasitics, device channel lengths, and timing performance comparing FinFET vs GAA nanosheets.",
          fileUrl: "https://arxiv.org/pdf/2103.11192.pdf",
          category: "research_paper",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: randomUUID(),
          tenantId: tenant.id,
          title: "VLSI Layout Design & DRC Verification Worksheet",
          author: "Prof. Anantha Chandrakasan",
          description: "Hands-on worksheet detailing design rule checks (DRC), layout spacing constraints, metal layer routing practices, and parasitics extraction exercises.",
          fileUrl: "https://www.ece.ucsb.edu/~canyon/ece124a/drc_rules_lab.pdf",
          category: "worksheet",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      db.digital_library.push(...libraryAssets);
      console.log(`  + Seeded digital library assets.`);
    }

    // 6. Student Mock Data (Quiz attempts, job applications, notifications, certificates)
    const studentsList = db.students.filter((s: any) => s.tenantId === tenant.id);
    const tenantCourses = db.courses.filter((c: any) => c.tenantId === tenant.id);
    const tenantQuizzes = db.quizzes.filter((q: any) => tenantCourses.map((c: any) => c.id).includes(q.courseId));

    for (const student of studentsList) {
      // Job Applications
      const studentApps = db.job_applications.filter((ja: any) => ja.studentId === student.id);
      if (studentApps.length === 0 && tenantJobs.length >= 2) {
        db.job_applications.push(
          {
            id: randomUUID(),
            tenantId: tenant.id,
            studentId: student.id,
            jobId: tenantJobs[0].id,
            resumeUrl: "https://drive.google.com/file/d/sample-resume-doc/view",
            status: "interviewing",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: randomUUID(),
            tenantId: tenant.id,
            studentId: student.id,
            jobId: tenantJobs[1].id,
            resumeUrl: "https://drive.google.com/file/d/sample-resume-doc/view",
            status: "applied",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );
        console.log(`  + Seeded job applications for student ID: ${student.id}`);
      }

      // Notifications
      const studentUser = db.users.find((u: any) => u.id === student.userId);
      if (studentUser) {
        const userNotifs = db.notifications.filter((n: any) => n.userId === studentUser.id);
        if (userNotifs.length === 0) {
          db.notifications.push(
            {
              id: randomUUID(),
              tenantId: tenant.id,
              userId: studentUser.id,
              title: "Welcome to the Center of Excellence!",
              message: "Your application is approved and student profile is active. Get started with your learning courses.",
              type: "success",
              isRead: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: randomUUID(),
              tenantId: tenant.id,
              userId: studentUser.id,
              title: "Interview Shortlist: Silicon Verification",
              message: "Congratulations! You have been shortlisted for an interview. Please prepare your system validation notes.",
              type: "success",
              isRead: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: randomUUID(),
              tenantId: tenant.id,
              userId: studentUser.id,
              title: "Upcoming Class Reminder",
              message: "Live Session starts in 2 hours.",
              type: "info",
              isRead: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
          console.log(`  + Seeded notifications for student user: ${studentUser.email}`);
        }
      }

      // Quiz Attempts
      const studentQuizAttempts = db.quiz_attempts.filter((qa: any) => qa.studentId === student.id);
      if (studentQuizAttempts.length === 0 && tenantQuizzes.length > 0) {
        for (const quiz of tenantQuizzes) {
          db.quiz_attempts.push({
            id: randomUUID(),
            tenantId: tenant.id,
            studentId: student.id,
            quizId: quiz.id,
            score: 85,
            passed: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        console.log(`  + Seeded quiz attempts for student ID: ${student.id}`);
      }

      // Certificates for student ID
      const studentCerts = db.certificates.filter((c: any) => c.studentId === student.id);
      if (studentCerts.length === 0 && tenantCourses.length > 0) {
        db.certificates.push({
          id: randomUUID(),
          tenantId: tenant.id,
          studentId: student.id,
          courseId: tenantCourses[0].id,
          certificateCode: `CERT-${sub.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
          metadata: {
            avgScore: 85,
            grade: "A",
            digitalSignature: "0xHASHED_SIGNATURE_DATA_SEEDED"
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`  + Seeded completion certificate for student ID: ${student.id}`);
      }
    }
  }

  // Save back to db.json
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  console.log("db.json enriched and saved successfully!");
}

run().catch(console.error);
