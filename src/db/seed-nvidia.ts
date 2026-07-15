/**
 * Seed Script: Add Nvidia org (VT sibling) + Mellanox & Qualcomm leaf tenants
 * Run with: node --loader tsx src/db/seed-nvidia.ts
 * Or just: npx tsx src/db/seed-nvidia.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";

const DB_PATH = join(process.cwd(), "db.json");
const db = JSON.parse(readFileSync(DB_PATH, "utf8"));

// ── IDs ────────────────────────────────────────────────────────────────────

const wysbryxId = db.tenants.find((t: any) => t.subdomain === "wysbryx")?.id;
if (!wysbryxId) throw new Error("Wysbryx root tenant not found!");

const nvidiaId = randomUUID();
const mellanoxId = randomUUID();
const qualcommId = randomUUID();

const now = new Date().toISOString();
const passwordHash = bcrypt.hashSync("password123", 10);

// ── 1. TENANTS ─────────────────────────────────────────────────────────────

db.tenants.push(
  {
    id: nvidiaId,
    name: "Nvidia Corporation",
    subdomain: "nvidia",
    customDomain: null,
    dbName: null,
    branding: {
      logoUrl: "https://upload.wikimedia.org/wikipedia/sco/2/21/Nvidia_logo.svg",
      primaryColor: "#76B900",
      secondaryColor: "#1a1a1a",
      companyName: "Nvidia Corp"
    },
    status: "active",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    parentTenantId: wysbryxId,
    settings: {
      features: { enableLibrary: true, enablePlacement: true, enableProctoring: true, enableCertificates: true },
      gateways: { stripe: true, razorpay: false, paypal: false },
      restrictions: { maxUsers: 500, maxCourses: 50, allowSelfSignup: false }
    }
  },
  {
    id: mellanoxId,
    name: "Mellanox Technologies",
    subdomain: "mellanox",
    customDomain: null,
    dbName: null,
    branding: {
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/93/Mellanox_logo_2019.png",
      primaryColor: "#00B4D8",
      secondaryColor: "#023E8A",
      companyName: "Mellanox Academy"
    },
    status: "active",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    parentTenantId: nvidiaId,
    settings: {
      features: { enableLibrary: true, enablePlacement: true, enableProctoring: true, enableCertificates: true },
      gateways: { stripe: true, razorpay: false, paypal: false },
      restrictions: { maxUsers: 200, maxCourses: 20, allowSelfSignup: false }
    }
  },
  {
    id: qualcommId,
    name: "Qualcomm Institute",
    subdomain: "qualcomm",
    customDomain: null,
    dbName: null,
    branding: {
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Qualcomm-Logo.svg",
      primaryColor: "#3253DC",
      secondaryColor: "#1a1a1a",
      companyName: "Qualcomm Institute"
    },
    status: "active",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    parentTenantId: nvidiaId,
    settings: {
      features: { enableLibrary: true, enablePlacement: true, enableProctoring: true, enableCertificates: true },
      gateways: { stripe: true, razorpay: false, paypal: false },
      restrictions: { maxUsers: 200, maxCourses: 20, allowSelfSignup: false }
    }
  }
);

// ── 2. USERS (per leaf tenant) ─────────────────────────────────────────────

function seedUsersForTenant(tenantId: string, subdomain: string) {
  const staffRoles = [
    { role: "Owner", emailPrefix: "owner" },
    { role: "Admin", emailPrefix: "admin" },
    { role: "Program Manager", emailPrefix: "manager" },
    { role: "Faculty", emailPrefix: "faculty1" },
    { role: "Faculty", emailPrefix: "faculty2" },
    { role: "Mentor", emailPrefix: "mentor" },
  ];

  const userIds: string[] = [];
  for (const staff of staffRoles) {
    const id = randomUUID();
    userIds.push(id);
    db.users.push({
      id,
      tenantId,
      email: `${staff.emailPrefix}@${subdomain}.lms.com`,
      passwordHash,
      firstName: staff.emailPrefix.charAt(0).toUpperCase() + staff.emailPrefix.slice(1),
      lastName: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
      role: staff.role,
      customRoleId: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
    });
  }

  // Students
  const firstNames = ["Alex", "Sophia", "Ethan", "Olivia", "Noah", "Emma", "Liam", "Ava", "Lucas", "Mia"];
  const lastNames = ["Chen", "Patel", "Kim", "Nguyen", "Garcia", "Wang", "Singh", "Tanaka", "Lee", "Muller"];
  const studentUserIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const id = randomUUID();
    studentUserIds.push(id);
    db.users.push({
      id,
      tenantId,
      email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@student.${subdomain}.com`,
      passwordHash,
      firstName: firstNames[i],
      lastName: lastNames[i],
      role: "Student",
      customRoleId: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
    });
  }

  return { staffUserIds: userIds, studentUserIds };
}

// Also add Owner user for Nvidia org hub itself
const nvidiaOwnerId = randomUUID();
db.users.push({
  id: nvidiaOwnerId,
  tenantId: nvidiaId,
  email: "owner@nvidia.lms.com",
  passwordHash,
  firstName: "Jensen",
  lastName: "Huang",
  role: "Owner",
  customRoleId: null,
  status: "active",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  createdBy: null,
  updatedBy: null,
});

const mellanoxUsers = seedUsersForTenant(mellanoxId, "mellanox");
const qualcommUsers = seedUsersForTenant(qualcommId, "qualcomm");

// ── 3. BATCHES ─────────────────────────────────────────────────────────────

function seedBatchesForTenant(tenantId: string) {
  const batchNames = [
    "GPU Architecture & CUDA - 2026",
    "Deep Learning Accelerators - Batch A",
    "High-Speed Interconnects & NVLink"
  ];
  const batchIds: string[] = [];
  for (const name of batchNames) {
    const id = randomUUID();
    batchIds.push(id);
    db.batches.push({
      id,
      tenantId,
      name,
      description: `Training cohort for ${name}`,
      capacity: 40,
      startDate: "2026-01-15T00:00:00.000Z",
      endDate: "2026-12-15T00:00:00.000Z",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }
  return batchIds;
}

const mellanoxBatches = seedBatchesForTenant(mellanoxId);
const qualcommBatches = seedBatchesForTenant(qualcommId);

// ── 4. STUDENTS ────────────────────────────────────────────────────────────

function seedStudentsForTenant(tenantId: string, subdomain: string, studentUserIds: string[], batchIds: string[]) {
  const studentIds: string[] = [];
  for (let i = 0; i < studentUserIds.length; i++) {
    const id = randomUUID();
    studentIds.push(id);
    const batchId = batchIds[i % batchIds.length];
    const rollNum = `ME-${subdomain.toUpperCase()}-26-${(7000 + i).toString()}`;
    db.students.push({
      id,
      tenantId,
      userId: studentUserIds[i],
      batchId,
      rollNumber: rollNum,
      admissionNumber: `ADM-${subdomain.toUpperCase()}-${(7000 + i).toString()}`,
      resumeUrl: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  return studentIds;
}

const mellanoxStudents = seedStudentsForTenant(mellanoxId, "mellanox", mellanoxUsers.studentUserIds, mellanoxBatches);
const qualcommStudents = seedStudentsForTenant(qualcommId, "qualcomm", qualcommUsers.studentUserIds, qualcommBatches);

// ── 5. COURSES ─────────────────────────────────────────────────────────────

interface CourseSpec {
  code: string;
  name: string;
  description: string;
  modules: { name: string; description: string; lessons: { title: string; contentType: string; content: string; videoUrl?: string }[] }[];
}

const mellanoxCourseSpecs: CourseSpec[] = [
  {
    code: "NIC-201",
    name: "SmartNIC Architecture & DPU Design",
    description: "Comprehensive training on network interface card architecture, data processing units, and high-throughput packet processing design.",
    modules: [
      {
        name: "Module 1: Fundamentals of SmartNIC Design",
        description: "Core concepts in NIC architecture, RDMA, and offload engines.",
        lessons: [
          { title: "1.1 Introduction to SmartNIC Architecture (Video)", contentType: "video", content: "In this lesson we explore the evolution of network adapters from simple NICs to intelligent SmartNICs capable of running complex networking functions.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
          { title: "1.2 RDMA Over Converged Ethernet (RoCE)", contentType: "text", content: "Remote Direct Memory Access (RDMA) enables high-throughput, low-latency networking by bypassing the kernel. RoCE v2 encapsulates InfiniBand transport over UDP/IP, enabling deployment on standard Ethernet fabrics. Key performance metrics include message rate (millions of operations/sec), bandwidth (Gb/s), and 99th percentile tail latency." },
          { title: "1.3 DPU Pipeline Processing", contentType: "text", content: "Data Processing Units (DPUs) combine SmartNIC functionality with general-purpose ARM cores. The BlueField DPU runs a full Linux OS on-board, handling network, storage, and security offloads. This architecture frees the host CPU for application workloads." },
          { title: "1.4 ConnectX Firmware Architecture (Video)", contentType: "video", content: "Deep dive into Mellanox ConnectX firmware layers and command interface protocols.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
          { title: "1.5 Lab: Configuring SR-IOV Virtual Functions", contentType: "text", content: "In this lab, you will configure Single Root I/O Virtualization (SR-IOV) on a ConnectX-6 adapter, create virtual functions, assign them to VMs, and measure throughput using iperf3 and perftest benchmarks." },
        ]
      },
      {
        name: "Module 2: High-Speed Interconnect Protocols",
        description: "InfiniBand, NVLink, and PCIe Gen5 protocol fundamentals.",
        lessons: [
          { title: "2.1 InfiniBand Subnet Management", contentType: "video", content: "Understanding InfiniBand subnet manager architecture, routing algorithms, and partition key management for HPC clusters.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
          { title: "2.2 PCIe Gen5 Signal Integrity", contentType: "text", content: "PCIe Gen5 operates at 32 GT/s per lane with 128b/130b encoding. At these speeds, channel loss, crosstalk, and impedance discontinuities become critical. Equalization techniques including CTLE (Continuous Time Linear Equalizer) and DFE (Decision Feedback Equalizer) are mandatory for reliable operation." },
          { title: "2.3 NVLink & NVSwitch Topology", contentType: "text", content: "NVLink provides 900 GB/s bidirectional bandwidth between GPUs. NVSwitch enables all-to-all GPU communication in DGX systems. This lesson covers link training, credit-based flow control, and error detection mechanisms in NVLink 4.0." },
          { title: "2.4 RDMA Performance Benchmarking", contentType: "text", content: "Using tools like ib_send_bw, ib_write_lat, and perftest to benchmark RDMA performance. Understand how to interpret bandwidth curves, latency distributions, and identify bottlenecks in the RDMA data path." },
          { title: "2.5 Lab: Multi-Host GPU Direct RDMA", contentType: "text", content: "Configure GPUDirect RDMA between two hosts equipped with ConnectX adapters and NVIDIA GPUs. Measure zero-copy transfer performance and compare against traditional CPU-staged transfers." },
        ]
      }
    ]
  }
];

const qualcommCourseSpecs: CourseSpec[] = [
  {
    code: "SOC-301",
    name: "Mobile SoC Design & 5G Modem Integration",
    description: "End-to-end mobile system-on-chip design covering Snapdragon architecture, Adreno GPU microarchitecture, and 5G modem baseband integration.",
    modules: [
      {
        name: "Module 1: Snapdragon SoC Architecture",
        description: "Kryo CPU cores, Adreno GPU, and Hexagon DSP subsystems.",
        lessons: [
          { title: "1.1 SoC Architecture Overview (Video)", contentType: "video", content: "Introduction to mobile SoC design philosophy, heterogeneous computing with big.LITTLE core configurations, and power management strategies.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
          { title: "1.2 Kryo CPU Microarchitecture", contentType: "text", content: "Qualcomm's custom Kryo cores are based on ARM v9 ISA with proprietary extensions. Key innovations include adaptive prefetching, branch prediction improvements, and deep out-of-order execution pipelines optimized for mobile workloads." },
          { title: "1.3 Adreno GPU Shader Architecture", contentType: "text", content: "The Adreno GPU uses a tile-based deferred rendering (TBDR) architecture. Each shader processor contains ALU units capable of FP32 and FP16 operations. This lesson covers the binning pass, rendering pass, and visibility stream compression." },
          { title: "1.4 Hexagon DSP & Neural Processing (Video)", contentType: "video", content: "Deep dive into the Hexagon DSP architecture used for audio processing, sensor fusion, and on-device AI inference acceleration.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
          { title: "1.5 Power Management: DCVS & LPM", contentType: "text", content: "Dynamic Clock and Voltage Scaling (DCVS) adjusts operating points in real-time based on workload. Low Power Modes (LPM) range from clock gating to full power collapse with state retention. Understanding C-states and P-states is essential." },
        ]
      },
      {
        name: "Module 2: 5G Modem Baseband Design",
        description: "X75 modem architecture, mmWave antenna design, and protocol stack.",
        lessons: [
          { title: "2.1 5G NR Physical Layer Overview", contentType: "video", content: "5G New Radio physical layer fundamentals including OFDM waveforms, massive MIMO antenna configurations, and beamforming techniques.", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
          { title: "2.2 mmWave Front-End Module Design", contentType: "text", content: "Millimeter wave (mmWave) frequencies (24-100 GHz) require specialized antenna array designs. This lesson covers phased array beam steering, array factor calculations, and front-end module (FEM) integration including LNA, PA, and phase shifter components." },
          { title: "2.3 Modem DSP Pipeline", contentType: "text", content: "The baseband DSP pipeline handles channel estimation, LDPC decoding, and HARQ processing. Understanding the timing constraints of the 5G NR slot structure (0.5ms for 30kHz subcarrier spacing) is critical for meeting the processing deadline." },
          { title: "2.4 Protocol Stack: RRC & NAS", contentType: "text", content: "Radio Resource Control (RRC) manages radio bearer setup, measurement reporting, and handover. Non-Access Stratum (NAS) handles authentication, security mode commands, and PDU session management. This lesson traces a complete call flow." },
          { title: "2.5 Lab: 5G NR Link Budget Analysis", contentType: "text", content: "Calculate path loss, antenna gain, and noise figure for a 5G NR link at both sub-6 GHz and mmWave frequencies. Determine maximum allowable path loss (MAPL) and estimate cell radius for urban and suburban deployments." },
        ]
      }
    ]
  }
];

function seedCoursesForTenant(tenantId: string, specs: CourseSpec[], batchIds: string[]) {
  const courseIds: string[] = [];
  for (const spec of specs) {
    const courseId = randomUUID();
    courseIds.push(courseId);
    db.courses.push({
      id: courseId,
      tenantId,
      code: spec.code,
      name: spec.name,
      description: spec.description,
      syllabus: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    // Link course to all batches
    for (const batchId of batchIds) {
      db.course_batches.push({ courseId, batchId });
    }

    // Modules & Lessons
    for (let mi = 0; mi < spec.modules.length; mi++) {
      const mod = spec.modules[mi];
      const moduleId = randomUUID();
      db.modules.push({
        id: moduleId,
        courseId,
        name: mod.name,
        description: mod.description,
        order: mi,
        createdAt: now,
        updatedAt: now,
      });

      for (let li = 0; li < mod.lessons.length; li++) {
        const lesson = mod.lessons[li];
        db.lessons.push({
          id: randomUUID(),
          moduleId,
          title: lesson.title,
          content: lesson.content,
          contentType: lesson.contentType,
          videoUrl: lesson.videoUrl || null,
          fileUrl: null,
          zoomMeetingId: null,
          zoomPasscode: null,
          order: li,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Quiz per course
    const quizId = randomUUID();
    db.quizzes.push({
      id: quizId,
      courseId,
      lessonId: null,
      title: `${spec.name} - Assessment`,
      description: `Comprehensive assessment for ${spec.name}`,
      passingScore: 70,
      createdAt: now,
      updatedAt: now,
    });

    // 5 quiz questions
    const questions = [
      { q: "Which protocol enables zero-copy data transfer between host memory and network adapter?", opts: ["TCP/IP", "RDMA", "UDP", "SCTP"], correct: "b" },
      { q: "What does CTLE stand for in high-speed serial link design?", opts: ["Continuous Time Linear Equalizer", "Clock Time Level Estimator", "Channel Training Loop Engine", "Capacitive Threshold Logic Element"], correct: "a" },
      { q: "Which encoding scheme does PCIe Gen5 use?", opts: ["8b/10b", "64b/66b", "128b/130b", "256b/260b"], correct: "c" },
      { q: "What is the primary advantage of tile-based deferred rendering?", opts: ["Lower memory bandwidth", "Higher polygon count", "Better anti-aliasing", "Simpler shaders"], correct: "a" },
      { q: "In 5G NR, what is the slot duration for 30kHz subcarrier spacing?", opts: ["1ms", "0.5ms", "0.25ms", "2ms"], correct: "b" },
    ];

    for (let qi = 0; qi < questions.length; qi++) {
      const qData = questions[qi];
      const optIds = ["a", "b", "c", "d"];
      db.quiz_questions.push({
        id: randomUUID(),
        quizId,
        questionText: qData.q,
        questionType: "mcq",
        options: qData.opts.map((text, oi) => ({ id: optIds[oi], text })),
        correctOptionId: qData.correct,
        order: qi,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return courseIds;
}

const mellanoxCourses = seedCoursesForTenant(mellanoxId, mellanoxCourseSpecs, mellanoxBatches);
const qualcommCourses = seedCoursesForTenant(qualcommId, qualcommCourseSpecs, qualcommBatches);

// ── 6. CAPSTONE PROJECTS ───────────────────────────────────────────────────

function seedProjectsForTenant(tenantId: string, courseIds: string[], studentIds: string[]) {
  for (const courseId of courseIds) {
    const course = db.courses.find((c: any) => c.id === courseId);
    const projectId = randomUUID();
    db.projects.push({
      id: projectId,
      tenantId,
      courseId,
      title: `${course?.name || "Course"} - Capstone Project`,
      description: `This capstone project requires designing and implementing a complete component for ${course?.name || "this course"}.\n\nYou must submit:\n1. A fully documented Git Repository link with your source code, testbenches, and design documents.\n2. A comprehensive Design Report PDF detailing your architecture decisions, performance benchmarks, and optimization strategies.\n\n**Submission Guidelines**:\n- Ensure your repository has a descriptive README.md.\n- Include performance benchmark results comparing your implementation against baseline.\n- The grade will be assigned based on design quality, code organization, and documentation thoroughness.`,
      difficulty: "Advanced",
      durationWeeks: 6,
      createdAt: now,
    });

    // 3 submissions per project
    if (studentIds.length >= 3) {
      db.project_submissions.push(
        {
          id: randomUUID(),
          tenantId,
          projectId,
          studentId: studentIds[0],
          gitRepoUrl: `https://github.com/student/capstone-${courseId.slice(0, 8)}`,
          documentationUrl: `https://drive.google.com/file/d/${randomUUID()}/view`,
          status: "pending",
          grade: null,
          feedback: null,
          submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: randomUUID(),
          tenantId,
          projectId,
          studentId: studentIds[1],
          gitRepoUrl: `https://github.com/student/project-${courseId.slice(0, 8)}`,
          documentationUrl: `https://drive.google.com/file/d/${randomUUID()}/view`,
          status: "approved",
          grade: "91",
          feedback: "Excellent implementation with clean architecture and thorough benchmarking. Well documented.",
          submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
        {
          id: randomUUID(),
          tenantId,
          projectId,
          studentId: studentIds[2],
          gitRepoUrl: `https://github.com/student/design-${courseId.slice(0, 8)}`,
          documentationUrl: null,
          status: "failed",
          grade: "58",
          feedback: "Missing performance benchmarks and incomplete documentation. Please revise and resubmit.",
          submittedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        }
      );
    }
  }
}

seedProjectsForTenant(mellanoxId, mellanoxCourses, mellanoxStudents);
seedProjectsForTenant(qualcommId, qualcommCourses, qualcommStudents);

// ── 7. ADMISSION APPLICATIONS (sample) ─────────────────────────────────────

function seedAdmissionsForTenant(tenantId: string, batchIds: string[]) {
  const apps = [
    { first: "Raj", last: "Kumar", email: "raj.kumar@applicant.com" },
    { first: "Sarah", last: "Liu", email: "sarah.liu@applicant.com" },
    { first: "Carlos", last: "Martinez", email: "carlos.m@applicant.com" },
  ];
  for (let i = 0; i < apps.length; i++) {
    db.admission_applications.push({
      id: randomUUID(),
      tenantId,
      batchId: batchIds[i % batchIds.length],
      email: apps[i].email,
      firstName: apps[i].first,
      lastName: apps[i].last,
      phone: `+91 90000${(10000 + i).toString()}`,
      dateOfBirth: "1999-06-15T00:00:00.000Z",
      academicHistory: {
        highestDegree: "B.Tech Electronics",
        institution: "IIT Delhi",
        gpaOrPercentage: "8.2",
        graduationYear: 2023,
        experienceMonths: 12,
      },
      status: "approved",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
    });
  }
}

seedAdmissionsForTenant(mellanoxId, mellanoxBatches);
seedAdmissionsForTenant(qualcommId, qualcommBatches);

// ── WRITE ──────────────────────────────────────────────────────────────────

writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");

console.log("✅ Nvidia org + Mellanox & Qualcomm leaf tenants seeded successfully!");
console.log(`   Nvidia ID:    ${nvidiaId}`);
console.log(`   Mellanox ID:  ${mellanoxId}`);
console.log(`   Qualcomm ID:  ${qualcommId}`);
console.log(`   New tenants: 3`);
console.log(`   New users:   ${1 + 16 + 16} (1 Nvidia owner + 16 per leaf)`);
console.log(`   New students: ${mellanoxStudents.length + qualcommStudents.length}`);
console.log(`   New batches:  ${mellanoxBatches.length + qualcommBatches.length}`);
console.log(`   New courses:  ${mellanoxCourses.length + qualcommCourses.length}`);
