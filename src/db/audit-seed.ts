import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const dbJsonPath = path.resolve(process.cwd(), "db.json");

if (!fs.existsSync(dbJsonPath)) {
  console.error(`db.json not found at ${dbJsonPath}`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbJsonPath, "utf-8"));

// Enforce array structures
const tables = [
  "tenants", "permissions", "roles", "role_permissions", "users", "batches",
  "courses", "course_batches", "students", "admission_applications",
  "admission_documents", "admission_payments", "modules", "lessons",
  "quizzes", "quiz_questions", "quiz_attempts", "notifications",
  "job_postings", "job_applications", "certificates", "digital_library",
  "lesson_progress", "projects", "project_submissions"
];

for (const t of tables) {
  if (!db[t]) db[t] = [];
}

const standardPermissions = [
  { id: "fdad0c05-5b58-4c0c-8deb-2f4b034580c3", name: "admission:read", description: "View admission applications" },
  { id: "621c6f59-2bca-4482-aae3-14a7a13385ca", name: "admission:write", description: "Create/edit admission applications" },
  { id: "8d4cb5ac-3b1a-4581-ac08-95ef97a5df39", name: "admission:approve", description: "Approve or reject admission applications" },
  { id: "b3b15b49-0322-4280-96a3-61cdb21f8c67", name: "batches:read", description: "View batches and schedules" },
  { id: "a9c9fba7-7a5c-48b0-ac5d-e4727b3b8e8f", name: "batches:write", description: "Create/manage batches" },
  { id: "b95dcbcb-bd91-4b54-9001-1d310b0c39be", name: "courses:read", description: "View courses" },
  { id: "b029a3f3-3e5c-49ce-9b99-718ae809a3f6", name: "courses:write", description: "Create/edit courses" },
  { id: "63a5614e-239b-46bb-84ae-38aca2851779", name: "courses:publish", description: "Publish courses" },
  { id: "f1cd1221-114b-47e4-8f6f-64cc18232ed4", name: "users:read", description: "View tenant users" },
  { id: "153221f5-6bb1-4c06-b0f8-f45ca97d8ab2", name: "users:write", description: "Create/manage tenant users" },
  { id: "c1b9aefc-8989-4025-820e-be815bf69c6f", name: "reports:read", description: "View reports and analytics" },
  { id: "2f5a16d3-9e19-4810-ab12-eea768346f32", name: "settings:read", description: "View tenant settings" },
  { id: "145c0375-6845-4894-8c16-04524bdb03cb", name: "settings:write", description: "Modify tenant settings" }
];

const globalPassHash = "$2b$10$262VOu2H7XJk3jSfBivYL.upOn9ynDpp6WxOvmnxfFMisIlta/MZS"; // "Password123"

// Seed/Update global permissions
for (const sp of standardPermissions) {
  if (!db.permissions.some((p: any) => p.name === sp.name)) {
    db.permissions.push({ ...sp, createdAt: new Date().toISOString() });
  }
}

// Target Tenants
const tenantsToVerify = [
  {
    id: "96652527-1198-4bbb-8bc4-30781efaed17",
    name: "Virginia Tech parent",
    subdomain: "vt",
    customDomain: "vt-lms.edu",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Virginia_Tech_Gobblers_logo.svg", primaryColor: "#861F41", secondaryColor: "#E87722", companyName: "Virginia Tech parent" },
    parentTenantId: null,
    dbName: "vt_db"
  },
  {
    id: "03e6d706-6e79-4dc5-96c1-e10f1beff95c",
    name: "Intel Semiconductor Academy",
    subdomain: "intel",
    customDomain: "intel-academy.com",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg", primaryColor: "#0068B5", secondaryColor: "#0071C5", companyName: "Intel Semiconductor Academy" },
    parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed17",
    dbName: "vt_db"
  },
  {
    id: "8c1598f4-6e79-4dc5-96c1-e10f1beff95c",
    name: "Intel Oregon Labs",
    subdomain: "intel-oregon",
    customDomain: "intel-oregon.com",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg", primaryColor: "#00508c", secondaryColor: "#0071C5", companyName: "Intel Oregon Labs" },
    parentTenantId: "03e6d706-6e79-4dc5-96c1-e10f1beff95c",
    dbName: "vt_db"
  },
  {
    id: "4491103f-37e0-44bd-9458-acde5af99a18",
    name: "AMD Training Center",
    subdomain: "amd",
    customDomain: "amd-coe.com",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg", primaryColor: "#ED1C24", secondaryColor: "#2b2b2b", companyName: "AMD Training Center" },
    parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed17",
    dbName: "vt_db"
  },
  {
    id: "15b66b68-2e97-4bad-b756-e4cc16923530",
    name: "TSMC Microelectronics Institute",
    subdomain: "tsmc",
    customDomain: "tsmc-coe.com",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/TSMC_logo.svg", primaryColor: "#E05423", secondaryColor: "#111111", companyName: "TSMC Microelectronics Institute" },
    parentTenantId: "96652527-1198-4bbb-8bc4-30781efaed17",
    dbName: "test1_db"
  },
  {
    id: "019915ce-3b05-4db3-a1c0-365f772f4e11",
    name: "Nvidia Academy",
    subdomain: "nvidia",
    customDomain: "nvidia.com",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg", primaryColor: "#76b900", secondaryColor: "#1a1a1a", companyName: "Nvidia Academy" },
    parentTenantId: null,
    dbName: "test1_db"
  },
  {
    id: "3c1598f4-6e79-4dc5-96c1-e10f1beff95d",
    name: "Nvidia Graphics Labs",
    subdomain: "nvidia-graphics",
    customDomain: "nvidia-graphics.com",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg", primaryColor: "#66a300", secondaryColor: "#111111", companyName: "Nvidia Graphics Labs" },
    parentTenantId: "019915ce-3b05-4db3-a1c0-365f772f4e11",
    dbName: "test1_db"
  },
  {
    id: "4c1598f4-6e79-4dc5-96c1-e10f1beff95e",
    name: "Mellanox Networking Academy",
    subdomain: "mellanox",
    customDomain: "mellanox.com",
    branding: { logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg", primaryColor: "#3399ff", secondaryColor: "#1c1c1c", companyName: "Mellanox Networking Academy" },
    parentTenantId: "019915ce-3b05-4db3-a1c0-365f772f4e11",
    dbName: "test1_db"
  }
];

// Seed/Update Tenants
for (const t of tenantsToVerify) {
  const existingIdx = db.tenants.findIndex((x: any) => x.id === t.id);
  const tenantObj = {
    id: t.id,
    name: t.name,
    subdomain: t.subdomain,
    customDomain: t.customDomain,
    branding: t.branding,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    parentTenantId: t.parentTenantId,
    dbName: t.dbName,
    settings: {
      features: { enableLibrary: true, enablePlacement: true, enableProctoring: true, enableCertificates: true },
      gateways: { stripe: true, razorpay: true, paypal: true },
      restrictions: { maxUsers: 500, maxCourses: 100, allowSelfSignup: true }
    }
  };
  if (existingIdx >= 0) {
    db.tenants[existingIdx] = { ...db.tenants[existingIdx], ...tenantObj, branding: { ...db.tenants[existingIdx].branding, ...t.branding } };
  } else {
    db.tenants.push(tenantObj);
  }
}

// Generate complete data for each tenant
for (const t of tenantsToVerify) {
  console.log(`Auditing and Seeding: ${t.name} (.${t.subdomain})...`);

  // 1. Roles & permissions
  const roleNames = ["Owner", "Admin", "Program Manager", "Faculty", "Mentor", "Student", "Placement Officer", "Guest"];
  const roleMap: Record<string, string> = {};

  for (const rn of roleNames) {
    let role = db.roles.find((r: any) => r.tenantId === t.id && r.name === rn);
    if (!role) {
      const roleId = randomUUID();
      role = {
        id: roleId,
        tenantId: t.id,
        name: rn,
        description: `System role for ${rn}`,
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.roles.push(role);
    }
    roleMap[rn] = role.id;

    // Attach role permissions if not present
    for (const p of db.permissions) {
      let shouldAttach = false;
      if (rn === "Owner" || rn === "Admin") shouldAttach = true;
      else if (rn === "Program Manager" && (p.name.startsWith("batches:") || p.name.startsWith("courses:") || p.name.startsWith("reports:"))) shouldAttach = true;
      else if (rn === "Faculty" && (p.name.startsWith("courses:") || p.name.startsWith("batches:") || p.name.startsWith("reports:") || p.name.startsWith("admission:"))) shouldAttach = true;
      else if (rn === "Mentor" && (p.name === "courses:read" || p.name === "batches:read")) shouldAttach = true;
      else if (rn === "Student" && (p.name === "courses:read" || p.name === "batches:read")) shouldAttach = true;
      else if (rn === "Placement Officer" && (p.name === "users:read" || p.name === "reports:read")) shouldAttach = true;
      else if (rn === "Guest" && p.name === "courses:read") shouldAttach = true;

      if (shouldAttach) {
        if (!db.role_permissions.some((rp: any) => rp.roleId === role.id && rp.permissionId === p.id)) {
          db.role_permissions.push({ roleId: role.id, permissionId: p.id });
        }
      }
    }
  }

  // 2. Staff Users
  const staffTypes = [
    { prefix: "owner", role: "Owner" },
    { prefix: "admin", role: "Admin" },
    { prefix: "manager", role: "Program Manager" },
    { prefix: "faculty1", role: "Faculty" },
    { prefix: "faculty2", role: "Faculty" },
    { prefix: "mentor", role: "Mentor" },
    { prefix: "placement", role: "Placement Officer" }
  ];

  const passHash = "$2b$10$262VOu2H7XJk3jSfBivYL.upOn9ynDpp6WxOvmnxfFMisIlta/MZS"; // "Password123"

  for (const s of staffTypes) {
    const email = `${s.prefix}@${t.subdomain}.lms.com`;
    let user = db.users.find((u: any) => u.tenantId === t.id && u.email === email);
    if (!user) {
      const uId = randomUUID();
      user = {
        id: uId,
        tenantId: t.id,
        email,
        passwordHash: passHash,
        firstName: `${t.name.split(" ")[0]}`,
        lastName: s.role,
        role: s.role,
        customRoleId: roleMap[s.role],
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null
      };
      db.users.push(user);
    } else {
      user.passwordHash = passHash;
    }
  }

  // 3. Batches (Cohorts)
  const batchNames = [
    `${t.name.split(" ")[0]} Cohort Alpha`,
    `${t.name.split(" ")[0]} Cohort Beta`,
    `${t.name.split(" ")[0]} Intensive Lab`
  ];
  const batchIds: string[] = [];

  for (const bn of batchNames) {
    let batch = db.batches.find((b: any) => b.tenantId === t.id && b.name === bn);
    if (!batch) {
      const bId = randomUUID();
      batch = {
        id: bId,
        tenantId: t.id,
        name: bn,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        capacity: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.batches.push(batch);
    }
    batchIds.push(batch.id);
  }

  // 4. Courses (Dozen courses check/creation)
  const courseSpecs = [
    { code: "FAB-101", name: "Semiconductor Fabrication Processes", desc: "Introduction to physical layout synthesis, etching, sub-micron silicon structures, photolithography, and doping physics." },
    { code: "VLSI-202", name: "VLSI Architecture & CMOS Design", desc: "Design high performance custom CMOS cells, static/dynamic registers, floorplanning, clock tree routing, and parasitic delays." },
    { code: "CUDA-301", name: "Parallel Programming with CUDA C/C++", desc: "Accelerate numerical computation on GPU pipelines, warp execution optimization, shared memory banks, and memory latency hiding." },
    { code: "DLHW-402", name: "Deep Learning Hardware Accelerators", desc: "Study architecture of Tensor Cores, Matrix Multiply-Accumulate execution, INT8/FP8 quantization, and systolic arrays." },
    { code: "EDA-305", name: "Electronic Design Automation (EDA) Tools", desc: "Implement circuit simulation using Spice models, static timing analysis engines, logic synthesis, and DRC checkers." },
    { code: "NET-210", name: "High-Speed Interconnects & NVLink", desc: "Study multi-GPU physical fabrics, NVLink protocol stack, infiniBand architectures, and RDMA queue pairs." },
    { code: "RTX-501", name: "Real-Time Ray Tracing Core Synthesis", desc: "Hardware microarchitecture of BVH traversal engines, ray-triangle intersection shaders, and denoising hardware." },
    { code: "PHY-110", name: "Sub-Micron Semiconductor Device Physics", desc: "Explore quantum tunneling effects, gate leakage currents, FinFET & Gate-All-Around (GAA) transistor properties." }
  ];

  const courseMap: Record<string, string> = {};

  for (const cs of courseSpecs) {
    let course = db.courses.find((c: any) => c.tenantId === t.id && c.code === cs.code);
    if (!course) {
      const cId = randomUUID();
      course = {
        id: cId,
        tenantId: t.id,
        code: cs.code,
        name: cs.name,
        description: cs.desc,
        syllabus: `Module 1: Fundamental Concepts\nModule 2: Advanced Design & Synthesizer Labs\nModule 3: Verification & DRC checks`,
        status: "published",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.courses.push(course);
    }
    courseMap[cs.code] = course.id;

    // Link Course to all Batches
    for (const bId of batchIds) {
      if (!db.course_batches.some((cb: any) => cb.courseId === course.id && cb.batchId === bId)) {
        db.course_batches.push({
          courseId: course.id,
          batchId: bId
        });
      }
    }

    // 5. Modules & Lessons (Lectures) for each course
    const modNames = ["Introduction and Architecture", "Labs, Timing and Verification"];
    for (let mIdx = 0; mIdx < modNames.length; mIdx++) {
      let mod = db.modules.find((m: any) => m.tenantId === t.id && m.courseId === course.id && m.name === modNames[mIdx]);
      if (!mod) {
        const mId = randomUUID();
        mod = {
          id: mId,
          tenantId: t.id,
          courseId: course.id,
          name: modNames[mIdx],
          description: `Comprehensive overview of course material under module ${mIdx + 1}.`,
          orderIndex: mIdx + 1,
          createdAt: new Date().toISOString()
        };
        db.modules.push(mod);
      }

      // Add 3 lessons (lectures) per module
      const lessonTitles = [
        `Lecture ${mIdx * 3 + 1}: Theoretical Underpinnings of ${cs.name}`,
        `Lecture ${mIdx * 3 + 2}: EDA Synthesis & Practical Simulation Node`,
        `Lecture ${mIdx * 3 + 3}: Lab Exercise — Verification Report`
      ];

      for (let lIdx = 0; lIdx < lessonTitles.length; lIdx++) {
        let lesson = db.lessons.find((l: any) => l.tenantId === t.id && l.moduleId === mod.id && l.title === lessonTitles[lIdx]);
        if (!lesson) {
          const lId = randomUUID();
          lesson = {
            id: lId,
            tenantId: t.id,
            moduleId: mod.id,
            title: lessonTitles[lIdx],
            contentType: lIdx % 2 === 0 ? "video" : "text",
            contentUrl: lIdx % 2 === 0 ? "https://dummy-bucket.s3.amazonaws.com/videos/lecture.mp4" : null,
            textContent: lIdx % 2 !== 0 ? `Detailed syllabus reading for ${cs.name} under ${mod.name}.` : null,
            orderIndex: lIdx + 1,
            isFreePreview: lIdx === 0,
            createdAt: new Date().toISOString()
          };
          db.lessons.push(lesson);
        }
      }

      // 6. Quiz & Quiz Questions
      let quiz = db.quizzes.find((q: any) => q.tenantId === t.id && q.moduleId === mod.id);
      if (!quiz) {
        const qId = randomUUID();
        quiz = {
          id: qId,
          tenantId: t.id,
          moduleId: mod.id,
          title: `Module ${mIdx + 1} Assessment`,
          description: `Test your synthesis knowledge on ${cs.name}.`,
          passingScore: 70,
          createdAt: new Date().toISOString()
        };
        db.quizzes.push(quiz);
      }

      const questions = [
        { q: `What is the primary constraint optimized during floorplanning of ${cs.name}?`, opts: ["Power dissipation", "Routing Area and Congestion", "Clock frequency limits", "All of the above"], ans: 3 },
        { q: `In FinFET semiconductor design, which leakage is most severe at 7nm nodes?`, opts: ["Sub-threshold leakage", "Gate-oxide tunneling", "Drain-induced barrier lowering", "Punchthrough"], ans: 1 },
        { q: `Which memory optimization yields lowest latency on CUDA matrix calculations?`, opts: ["Coalesced global read", "Shared memory banking", "Register file caching", "L1 cache bypass"], ans: 1 }
      ];

      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const quest = questions[qIdx];
        let quizQ = db.quiz_questions.find((qq: any) => qq.tenantId === t.id && qq.quizId === quiz.id && qq.questionText === quest.q);
        if (!quizQ) {
          db.quiz_questions.push({
            id: randomUUID(),
            tenantId: t.id,
            quizId: quiz.id,
            questionText: quest.q,
            options: quest.opts,
            correctAnswerIndex: quest.ans,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  }

  // 7. Seed Dozens of Students and Applications
  // We generate 15 students per tenant/sub-tenant, linked to active batches.
  for (let sIdx = 1; sIdx <= 15; sIdx++) {
    const sEmail = `student${sIdx}@student.${t.subdomain}.com`;
    let user = db.users.find((u: any) => u.tenantId === t.id && u.email === sEmail);
    if (!user) {
      const uId = randomUUID();
      user = {
        id: uId,
        tenantId: t.id,
        email: sEmail,
        passwordHash: passHash,
        firstName: `StudentFirst${sIdx}`,
        lastName: `Last${t.name.split(" ")[0]}`,
        role: "Student",
        customRoleId: roleMap["Student"],
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null
      };
      db.users.push(user);
    } else {
      user.passwordHash = passHash;
    }

    const assignedBatchId = batchIds[sIdx % batchIds.length];

    let student = db.students.find((std: any) => std.tenantId === t.id && std.userId === user.id);
    if (!student) {
      student = {
        id: randomUUID(),
        tenantId: t.id,
        userId: user.id,
        batchId: assignedBatchId,
        studentRosterId: `${t.subdomain.toUpperCase()}-2026-${1000 + sIdx}`,
        status: sIdx === 15 ? "completed" : "active",
        academicRosterDetails: {
          enrollmentType: "regular",
          specialization: "Microelectronics layout synthesis",
          admissionYear: 2026
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.students.push(student);
    }

    // 8. Admission Applications, Docs, Payments
    let app = db.admission_applications.find((ap: any) => ap.tenantId === t.id && ap.email === sEmail);
    if (!app) {
      const aId = randomUUID();
      app = {
        id: aId,
        tenantId: t.id,
        batchId: assignedBatchId,
        email: sEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: `+91 98888${String(10000 + sIdx).substring(1)}`,
        dateOfBirth: new Date("1998-05-15").toISOString(),
        academicHistory: {
          highestDegree: "B.Tech Electronics & Comm",
          institution: "VTU India",
          gpaOrPercentage: "8.5",
          graduationYear: 2022,
          experienceMonths: 12
        },
        status: sIdx === 15 ? "completed" : "approved",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.admission_applications.push(app);

      // Add admission document
      db.admission_documents.push({
        id: randomUUID(),
        tenantId: t.id,
        applicationId: aId,
        documentType: "Undergraduate Degree Transcript",
        documentUrl: "https://dummy-bucket.s3.amazonaws.com/admissions/docs/transcript.pdf",
        status: "verified",
        uploadedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Add admission payment
      db.admission_payments.push({
        id: randomUUID(),
        tenantId: t.id,
        applicationId: aId,
        amount: 2500.00,
        currency: "USD",
        gateway: "stripe",
        transactionId: `ch_mock_${randomUUID().substring(0, 12)}`,
        status: "paid",
        createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // 9. Generate Certificate for completed student
    if (student.status === "completed") {
      const courseId = Object.values(courseMap)[0];
      if (!db.certificates.some((c: any) => c.tenantId === t.id && c.studentId === student.id)) {
        db.certificates.push({
          id: randomUUID(),
          tenantId: t.id,
          studentId: student.id,
          courseId,
          certificateUrl: "https://dummy-bucket.s3.amazonaws.com/certificates/cert_101.pdf",
          issueDate: new Date().toISOString(),
          verificationCode: `CERT-${randomUUID().substring(0, 8).toUpperCase()}`
        });
      }
    }
  }

  // 10. Job Postings & Applications
  const jobs = [
    { title: "Senior Silicon RTL Design Engineer", desc: "Design high speed layout blocks, verify clock tree synthesize guidelines, and static timing constraints." },
    { title: "CUDA Kernel Performance Architect", desc: "Optimize matrix multipliers on GPU architectures, write custom kernel shaders, and debug memory banks." },
    { title: "Physical Synthesis verification Specialist", desc: "Run DRC rules, evaluate spice simulations, and ensure zero negative timing margins." }
  ];

  for (const j of jobs) {
    let job = db.job_postings.find((jp: any) => jp.tenantId === t.id && jp.title === j.title);
    if (!job) {
      job = {
        id: randomUUID(),
        tenantId: t.id,
        title: j.title,
        description: j.desc,
        companyName: t.name,
        location: "San Jose, CA (Hybrid)",
        requirements: "MS/PhD in VLSI design, semiconductor devices, or equivalent with 3+ years experience.",
        status: "active",
        createdAt: new Date().toISOString()
      };
      db.job_postings.push(job);
    }
  }

  // 11. Digital Library Assets
  const libAssets = [
    { title: `${t.name.split(" ")[0]} RTL Coding Standard Manual`, type: "pdf" },
    { title: `Ampere & Hopper GPU microarchitecture Guide`, type: "pdf" },
    { title: `Clock Tree Synthesis Floorplanning Best practices`, type: "link" }
  ];

  for (const la of libAssets) {
    if (!db.digital_library.some((dl: any) => dl.tenantId === t.id && dl.title === la.title)) {
      db.digital_library.push({
        id: randomUUID(),
        tenantId: t.id,
        title: la.title,
        resourceType: la.type,
        resourceUrl: la.type === "pdf" ? "https://dummy-bucket.s3.amazonaws.com/library/guide.pdf" : "https://nvidia.com/developers",
        uploadedBy: randomUUID(),
        createdAt: new Date().toISOString()
      });
    }
  }
}

// 12. Ensure Global SuperAdmin exists and has updated password
const globalSaEmail = "superadmin@wysbryx.com";
let globalSa = db.users.find((u: any) => u.email === globalSaEmail);
if (!globalSa) {
  globalSa = {
    id: randomUUID(),
    tenantId: "96652527-1198-4bbb-8bc4-30781efaed17", // vt parent tenant ID
    email: globalSaEmail,
    passwordHash: globalPassHash,
    firstName: "Wysbryx",
    lastName: "Super Admin",
    role: "SuperAdmin",
    customRoleId: "6add1182-a92d-492d-8ddd-a3b81b58d7f4",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null
  };
  db.users.push(globalSa);
} else {
  globalSa.passwordHash = globalPassHash;
}

// Fix password hash for ALL users in the system to ensure valid credentials
console.log(`Fixing password hashes for ${db.users.length} users...`);
for (const u of db.users) {
  u.passwordHash = globalPassHash;
}

// Write the database back
fs.writeFileSync(dbJsonPath, JSON.stringify(db, null, 2), "utf-8");
console.log("\n🌱 [AUDIT-SEED] Massive Multi-Tenant database auditing and seeding successfully completed!");
