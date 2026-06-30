import { db } from "./db";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import { sql, eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean existing database records (Safe reset for fresh seed)
  console.log("🧹 Cleaning existing data...");
  await db.execute(sql`TRUNCATE TABLE ${schema.projectSubmissions} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.projects} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.digitalLibrary} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.lessonProgress} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.quizAttempts} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.quizQuestions} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.quizzes} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.lessons} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.modules} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.courseBatches} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.courses} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.rolePermissions} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.students} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.users} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.roles} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.permissions} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.admissionPayments} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.admissionDocuments} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.admissionApplications} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.batches} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.tenants} CASCADE`);

  // Hash standard password for all seed users
  const passwordHash = await bcrypt.hash("Password123", 10);

  // 2. Seed Permissions
  console.log("🔑 Seeding Permissions...");
  const permissionList = [
    { name: "admission:read", description: "View admission applications" },
    { name: "admission:write", description: "Create/edit admission applications" },
    { name: "admission:approve", description: "Approve or reject admission applications" },
    { name: "batches:read", description: "View batches and schedules" },
    { name: "batches:write", description: "Create/manage batches" },
    { name: "courses:read", description: "View courses" },
    { name: "courses:write", description: "Create/edit courses" },
    { name: "courses:publish", description: "Publish courses" },
    { name: "users:read", description: "View tenant users" },
    { name: "users:write", description: "Create/manage tenant users" },
    { name: "reports:read", description: "View reports and analytics" },
    { name: "settings:read", description: "View tenant settings" },
    { name: "settings:write", description: "Modify tenant settings" },
  ];

  const seededPermissions = await db.insert(schema.permissions)
    .values(permissionList)
    .returning();

  const permissionMap = new Map(seededPermissions.map(p => [p.name, p.id]));

  // 3. Seed Tenants
  console.log("🏢 Seeding Tenants...");
  const tenantList = [
    {
      name: "Virginia Tech parent",
      subdomain: "vt",
      customDomain: "vt-lms.edu",
      status: "active",
      branding: {
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Virginia_Tech_Gobblers_logo.svg",
        primaryColor: "#861F41",
        secondaryColor: "#E57724",
        companyName: "Virginia Tech",
      },
    },
    {
      name: "Intel Semiconductor Academy",
      subdomain: "intel",
      customDomain: "intel-academy.com",
      status: "active",
      branding: {
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg",
        primaryColor: "#0068B5",
        secondaryColor: "#0071C5",
        companyName: "Intel CoE",
      },
    },
    {
      name: "AMD Training Center",
      subdomain: "amd",
      customDomain: "amd-coe.com",
      status: "active",
      branding: {
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg",
        primaryColor: "#ED1C24",
        secondaryColor: "#1a1a1a",
        companyName: "AMD Academy",
      },
    },
    {
      name: "TSMC Microelectronics Institute",
      subdomain: "tsmc",
      customDomain: "tsmc-coe.org",
      status: "active",
      branding: {
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/TSMC_logo.svg",
        primaryColor: "#000000",
        secondaryColor: "#E05423",
        companyName: "TSMC Institute",
      },
    },
  ];

  const seededTenants = await db.insert(schema.tenants)
    .values(tenantList)
    .returning();

  // 4. Seed Roles and Role-Permissions per Tenant
  console.log("🛡️ Seeding Roles & Permissions Matrix per Tenant...");
  
  for (const tenant of seededTenants) {
    const rolesData = [
      { name: "Owner", description: "Tenant account owner", isSystem: true, tenantId: tenant.id },
      { name: "Admin", description: "Tenant administrator", isSystem: true, tenantId: tenant.id },
      { name: "Program Manager", description: "Manages batches and courses", isSystem: true, tenantId: tenant.id },
      { name: "Faculty", description: "Instructs courses and evaluates assignments", isSystem: true, tenantId: tenant.id },
      { name: "Mentor", description: "Guides student projects", isSystem: true, tenantId: tenant.id },
      { name: "Student", description: "Learner in the institution", isSystem: true, tenantId: tenant.id },
      { name: "Placement Officer", description: "Handles job offers and placements", isSystem: true, tenantId: tenant.id },
      { name: "Guest", description: "Visitor access", isSystem: true, tenantId: tenant.id },
    ];

    const seededRoles = await db.insert(schema.roles).values(rolesData).returning();
    const roleMap = new Map(seededRoles.map(r => [r.name, r.id]));

    // Bind permissions to roles
    const mappings: { roleName: string; permissions: string[] }[] = [
      {
        roleName: "Owner",
        permissions: ["admission:read", "admission:write", "admission:approve", "batches:read", "batches:write", "courses:read", "courses:write", "courses:publish", "users:read", "users:write", "reports:read", "settings:read", "settings:write"],
      },
      {
        roleName: "Admin",
        permissions: ["admission:read", "admission:write", "admission:approve", "batches:read", "batches:write", "courses:read", "courses:write", "courses:publish", "users:read", "users:write", "reports:read", "settings:read", "settings:write"],
      },
      {
        roleName: "Program Manager",
        permissions: ["admission:read", "batches:read", "batches:write", "courses:read", "courses:write", "courses:publish", "reports:read"],
      },
      {
        roleName: "Faculty",
        permissions: ["batches:read", "courses:read", "courses:write"],
      },
      {
        roleName: "Mentor",
        permissions: ["batches:read", "courses:read"],
      },
      {
        roleName: "Student",
        permissions: ["batches:read", "courses:read"],
      },
      {
        roleName: "Placement Officer",
        permissions: ["reports:read", "batches:read"],
      },
      {
        roleName: "Guest",
        permissions: ["courses:read"],
      },
    ];

    const rolePermValues: any[] = [];
    for (const m of mappings) {
      const roleId = roleMap.get(m.roleName);
      if (roleId) {
        for (const pName of m.permissions) {
          const permId = permissionMap.get(pName);
          if (permId) {
            rolePermValues.push({ roleId, permissionId: permId });
          }
        }
      }
    }

    if (rolePermValues.length > 0) {
      await db.insert(schema.rolePermissions).values(rolePermValues);
    }

    if (tenant.subdomain === "vt") {
      console.log(`👤 Seeding Super Admin User for ${tenant.name}...`);
      const superAdminUser = {
        tenantId: tenant.id,
        firstName: "Virginia Tech",
        lastName: "Super Admin",
        email: "superadmin@vt.edu",
        passwordHash,
        role: "SuperAdmin",
        customRoleId: roleMap.get("Admin"),
        status: "active",
      };
      await db.insert(schema.users).values([superAdminUser]);
      continue;
    }

    // 5. Seed Batches per Tenant
    console.log(`📅 Seeding Batches for ${tenant.name}...`);
    const batchList = [
      {
        tenantId: tenant.id,
        name: "VLSI Design & Architecture - 2026",
        description: "Specialized training on VLSI architecture, physical design, and verilog modeling.",
        capacity: 45,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-12-31"),
      },
      {
        tenantId: tenant.id,
        name: "Embedded Systems & IoT - Batch A",
        description: "Focus on RTOS, ARM microcontroller programming, and semiconductor hardware design.",
        capacity: 40,
        startDate: new Date("2026-08-15"),
        endDate: new Date("2027-02-15"),
      },
      {
        tenantId: tenant.id,
        name: "RF Microelectronics & Testing",
        description: "Radio Frequency design, impedance matching, and high-frequency chip testing methodologies.",
        capacity: 30,
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-03-01"),
      },
    ];

    const seededBatches = await db.insert(schema.batches).values(batchList).returning();

    // 6. Seed Administrators, Faculty, and Mentors
    console.log(`👤 Seeding Staff Users for ${tenant.name}...`);
    const staffUsers = [
      {
        tenantId: tenant.id,
        firstName: `${tenant.branding?.companyName || "Academy"}`,
        lastName: "Owner",
        email: `owner@${tenant.subdomain}.lms.com`,
        passwordHash,
        role: "Owner",
        customRoleId: roleMap.get("Owner"),
        status: "active",
      },
      {
        tenantId: tenant.id,
        firstName: "Sarah",
        lastName: "Admin",
        email: `admin@${tenant.subdomain}.lms.com`,
        passwordHash,
        role: "Admin",
        customRoleId: roleMap.get("Admin"),
        status: "active",
      },
      {
        tenantId: tenant.id,
        firstName: "Michael",
        lastName: "Manager",
        email: `manager@${tenant.subdomain}.lms.com`,
        passwordHash,
        role: "Program Manager",
        customRoleId: roleMap.get("Program Manager"),
        status: "active",
      },
      {
        tenantId: tenant.id,
        firstName: "Prof. Alan",
        lastName: "Turing",
        email: `faculty1@${tenant.subdomain}.lms.com`,
        passwordHash,
        role: "Faculty",
        customRoleId: roleMap.get("Faculty"),
        status: "active",
      },
      {
        tenantId: tenant.id,
        firstName: "Dr. Grace",
        lastName: "Hopper",
        email: `faculty2@${tenant.subdomain}.lms.com`,
        passwordHash,
        role: "Faculty",
        customRoleId: roleMap.get("Faculty"),
        status: "active",
      },
      {
        tenantId: tenant.id,
        firstName: "Steve",
        lastName: "Mentor",
        email: `mentor@${tenant.subdomain}.lms.com`,
        passwordHash,
        role: "Mentor",
        customRoleId: roleMap.get("Mentor"),
        status: "active",
      },
    ];

    await db.insert(schema.users).values(staffUsers);

    // 7. Seed Admission Applications, Documents, Payments, and Enrollments
    console.log(`📝 Seeding Admission Applications & Students for ${tenant.name}...`);
    
    // Generate 40 applications per tenant
    const appsToInsert: any[] = [];
    const firstNames = ["James", "John", "Robert", "Mary", "Patricia", "Jennifer", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Joseph", "Thomas", "Susan", "Jessica", "Charles", "Karen", "Christopher", "Nancy", "Matthew", "Lisa", "Betty", "Dorothy", "Sandra", "Ashley", "Paul", "Kimberly", "Donna", "Emily", "George", "Carol", "Jared", "Abigail", "Ethan", "Sophia", "Chloe", "Emma", "Jacob", "Ryan"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee", "Gonzalez", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez", "Hall", "Young", "Allen", "Sanchez", "Wright", "King", "Scott", "Green", "Baker", "Adams", "Nelson"];
    
    const degrees = ["B.Tech Electronics", "B.Sc Electrical Engineering", "M.Tech Microelectronics", "B.Tech Computer Science", "M.Sc Physics"];
    const institutions = ["IIT Bombay", "BITS Pilani", "MIT", "Stanford University", "IISc Bangalore", "NIT Trichy"];
    
    for (let i = 0; i < 40; i++) {
      const fName = firstNames[i % firstNames.length];
      const lName = lastNames[i % lastNames.length];
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${i}@student.${tenant.subdomain}.com`;
      const targetBatch = seededBatches[i % seededBatches.length];
      
      let status = "pending";
      if (i < 10) status = "approved";
      else if (i < 20) status = "payment_pending";
      else if (i < 30) status = "under_review";
      else if (i < 35) status = "rejected";

      appsToInsert.push({
        tenantId: tenant.id,
        batchId: targetBatch.id,
        email,
        firstName: fName,
        lastName: lName,
        phone: `+91 ${9000000000 + i}`,
        dateOfBirth: new Date(1998 + (i % 6), i % 12, (i * 7) % 28),
        academicHistory: {
          highestDegree: degrees[i % degrees.length],
          institution: institutions[i % institutions.length],
          gpaOrPercentage: (7.5 + (i % 25) * 0.1).toFixed(2),
          graduationYear: 2020 + (i % 6),
          experienceMonths: (i % 3) * 12,
        },
        status,
        createdAt: new Date(Date.now() - (40 - i) * 24 * 60 * 60 * 1000),
      });
    }

    const seededApps = await db.insert(schema.admissionApplications).values(appsToInsert).returning();

    for (const app of seededApps) {
      const docs = [
        {
          tenantId: tenant.id,
          applicationId: app.id,
          documentName: "Undergraduate Degree Certificate",
          fileUrl: `https://${tenant.subdomain}-s3-bucket.s3.amazonaws.com/admissions/docs/${app.id}_degree.pdf`,
          status: app.status === "approved" || app.status === "payment_pending" ? "verified" : "pending",
        },
        {
          tenantId: tenant.id,
          applicationId: app.id,
          documentName: "Valid Identity Proof (Passport/National ID)",
          fileUrl: `https://${tenant.subdomain}-s3-bucket.s3.amazonaws.com/admissions/docs/${app.id}_id.pdf`,
          status: app.status === "approved" || app.status === "payment_pending" ? "verified" : "pending",
        },
      ];
      await db.insert(schema.admissionDocuments).values(docs);

      if (app.status === "approved" || app.status === "payment_pending" || app.status === "under_review") {
        const payStatus = app.status === "approved" ? "completed" : "pending";
        await db.insert(schema.admissionPayments).values({
          tenantId: tenant.id,
          applicationId: app.id,
          amount: "1500.00",
          status: payStatus,
          paymentMethod: "stripe",
          transactionId: payStatus === "completed" ? `ch_${Math.random().toString(36).substring(2, 10).toUpperCase()}` : null,
        });
      }

      if (app.status === "approved") {
        const [studentUser] = await db.insert(schema.users).values({
          tenantId: tenant.id,
          firstName: app.firstName,
          lastName: app.lastName,
          email: app.email,
          passwordHash,
          role: "Student",
          customRoleId: roleMap.get("Student"),
          status: "active",
        }).returning();

        const rollSuffix = Math.floor(1000 + Math.random() * 9000);
        const year = new Date().getFullYear().toString().substring(2);
        
        await db.insert(schema.students).values({
          tenantId: tenant.id,
          userId: studentUser.id,
          batchId: app.batchId,
          rollNumber: `ME-${tenant.subdomain.toUpperCase()}-${year}-${rollSuffix}`,
          admissionNumber: `ADM-${tenant.subdomain.toUpperCase()}-${rollSuffix}`,
        });
      }
    }

    // 8. Seed Curriculum, Courses & Quiz content
    console.log(`📚 Seeding Courses, Lessons, and Quizzes for ${tenant.name}...`);
    let coursesData: any[] = [];
    if (tenant.subdomain === "intel") {
      coursesData = [
        {
          tenantId: tenant.id,
          code: "VLSI-101",
          name: "VLSI Physical Design & Verilog",
          description: "Comprehensive introduction to VLSI layouts, physical design stages, floorplanning, CTS, routing, and Verilog HDL.",
          syllabus: "Module 1: Introduction to VLSI\nModule 2: Synthesis & Floorplanning\nModule 3: Clock Tree Synthesis & Routing\nModule 4: Physical Verification & DRC",
        },
        {
          tenantId: tenant.id,
          code: "LITHO-302",
          name: "Advanced Photolithography & EUV",
          description: "In-depth study of nanometer scale chip fabrication, laser-produced tin plasma EUV light sources, and reflective optics.",
          syllabus: "Module 1: EUV Light Systems\nModule 2: High-NA EUV Optics\nModule 3: Mask Defectivity",
        }
      ];
    } else if (tenant.subdomain === "amd") {
      coursesData = [
        {
          tenantId: tenant.id,
          code: "EMB-201",
          name: "Embedded Systems & Real-Time Kernels",
          description: "Deep dive into embedded ARM systems, RTOS kernel synchronization, task scheduling, and microcontrollers.",
          syllabus: "Module 1: ARM Architecture\nModule 2: FreeRTOS Task Scheduling\nModule 3: Memory Management",
        }
      ];
    } else {
      coursesData = [
        {
          tenantId: tenant.id,
          code: "FAB-101",
          name: "Semiconductor Fab Operations & Safety",
          description: "Cleanroom protocols, silicon ingot slicing, oxidation, wet/dry etching, chemical vapor deposition, and safety standards.",
          syllabus: "Module 1: Cleanroom Air Filtration\nModule 2: Etching and Doping Processes\nModule 3: Hazard Management",
        }
      ];
    }

    const seededCourses = await db.insert(schema.courses).values(coursesData).returning();

    // Seed Capstone Projects for each Course
    console.log(`🏆 Seeding Capstone Projects for ${tenant.name}...`);
    for (const course of seededCourses) {
      await db.insert(schema.projects).values({
        tenantId: tenant.id,
        courseId: course.id,
        title: `${course.name} - Capstone Project`,
        description: `This capstone project requires designing and implementing a complete silicon component block for ${course.name}. 

You must submit:
1. A fully documented Git Repository link with your RTL codes, testbenches, and physical design scripts.
2. A comprehensive Design Report PDF detailing your floorplanning, timing analysis constraints, DRC violations report, and power analysis.

**Submission Guidelines**:
- Ensure your repository has a descriptive README.md.
- Double-check setup and hold slack timings. All paths must meet zero negative slack (MET).
- The grade will be assigned based on design efficiency, layout optimization, and timing margins.`,
        difficulty: "Advanced",
        durationWeeks: 6,
      });
    }

    // Seed Digital Library for each Tenant
    console.log(`📚 Seeding Digital Library for ${tenant.name}...`);
    const libraryAssets = [
      {
        tenantId: tenant.id,
        title: "CMOS VLSI Design: A Circuits and Systems Perspective (4th Edition)",
        author: "Neil Weste & David Harris",
        description: "The classic reference textbook covering CMOS circuit design, VLSI layouts, layout rules, layout constraints, timing analysis, and hardware modeling.",
        fileUrl: "https://www.rose-hulman.edu/~herring/ece300/Weste&Harris_4th.pdf",
        category: "book",
      },
      {
        tenantId: tenant.id,
        title: "FinFETs and Other Multi-Gate Transistors",
        author: "J.P. Colinge",
        description: "An advanced reference detailing 3D multi-gate transistors, sub-threshold leakage controls, electrostatic gate tuning, and nanotechnology process limits.",
        fileUrl: "https://link.springer.com/book/10.1007/978-0-387-71751-7",
        category: "book",
      },
      {
        tenantId: tenant.id,
        title: "EUV Lithography Systems & Technical Manual",
        author: "Intel Lithography Center of Excellence",
        description: "Cleanroom processes, tin plasma light sources, reflective mirror alignment, high-NA optical calculations, and defect mitigation procedures.",
        fileUrl: "https://www.intel.com/content/www/us/en/newsroom/resources/euvi-technology.html",
        category: "manual",
      },
      {
        tenantId: tenant.id,
        title: "Sub-3nm Gate-All-Around (GAA) Transistor Performance Study",
        author: "Dr. Grace Hopper, Steve Mentor",
        description: "A research publication investigating structural parasitics, device channel lengths, and timing performance comparing FinFET vs GAA nanosheets.",
        fileUrl: "https://arxiv.org/abs/2103.11192",
        category: "research_paper",
      },
      {
        tenantId: tenant.id,
        title: "VLSI Layout Design & DRC Verification Sheet",
        author: "Prof. Anantha Chandrakasan",
        description: "Hands-on worksheet detailing design rule checks (DRC), layout spacing constraints, metal layer routing practices, and parasitics extraction exercises.",
        fileUrl: "https://www.ece.ucsb.edu/~canyon/ece124a/drc_rules_lab.pdf",
        category: "worksheet",
      },
      {
        tenantId: tenant.id,
        title: "EUV Lithography Resolution & NA Practice Problems",
        author: "ASML Lithography Operations Team",
        description: "Practice calculations for numerical aperture (NA), resolution bounds, depth of focus (DoF), and tin plasma light reflectivity calculations.",
        fileUrl: "https://www.asml.com/-/media/asml/files/technology/euv-lithography-equations-handout.pdf",
        category: "worksheet",
      }
    ];
    await db.insert(schema.digitalLibrary).values(libraryAssets);

    const cbLinks: any[] = [];
    for (const course of seededCourses) {
      for (const batch of seededBatches) {
        cbLinks.push({
          courseId: course.id,
          batchId: batch.id,
        });
      }
    }
    if (cbLinks.length > 0) {
      await db.insert(schema.courseBatches).values(cbLinks);
    }

    const tenantQuizzes: any[] = [];
    for (const course of seededCourses) {
      const [mod1] = await db.insert(schema.modules).values({
        courseId: course.id,
        name: "Module 1: Advanced Theoretical Foundation",
        description: "Focuses on deep physics, mathematical models, and underlying system architectures.",
        order: 1,
      }).returning();

      const [mod2] = await db.insert(schema.modules).values({
        courseId: course.id,
        name: "Module 2: Synthesis, Simulation & Labs",
        description: "Hands-on implementation pipelines, CAD tools, physical layout design, and design-rule verification.",
        order: 2,
      }).returning();

      // Module 1 Lessons
      const mod1Lessons = [
        {
          moduleId: mod1.id,
          title: "1.1 Technical Intro & Scope Overview",
          content: `Introduction to the core microarchitecture design challenges. This lesson covers key industry requirements, technology nodes (sub-5nm), and advanced logic library characterization. We will explore the theoretical boundaries of physical scaling.`,
          contentType: "video",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          order: 1,
        },
        {
          moduleId: mod1.id,
          title: "1.2 Theoretical Physics & Substrate Chemistry",
          content: `Detailed documentation on silicon wafer crystal structures, epitaxial growth techniques, and dopant diffusion models. This write-up outlines the chemical equations governing high-K metal gates (HKMG) and shallow trench isolation (STI) boundaries.`,
          contentType: "text",
          order: 2,
        },
        {
          moduleId: mod1.id,
          title: "1.3 Live Seminar: Advanced Physical Modeling",
          content: `Real-time interactive seminar covering multi-gate architectures (FinFETs, GAA nanosheets). The session includes a live whiteboard demonstration on gate pitch scaling and parasitics mitigation.`,
          contentType: "live_class",
          zoomMeetingId: "482 9182 3912",
          zoomPasscode: "VLSI_Live_2026",
          order: 3,
        },
        {
          moduleId: mod1.id,
          title: "1.4 Timing Analysis & Static Slack Calculation",
          content: `Deep technical lecture on setup and hold constraints. Learn about timing paths, clock jitter, skew budgets, and how cell delay is calculated using Non-Linear Delay Models (NLDM) and Composite Current Source (CCS) models.`,
          contentType: "text",
          fileUrl: "https://www.analog.com/media/en/training-seminars/tutorials/MT-001.pdf",
          order: 4,
        }
      ];

      // Module 2 Lessons
      const mod2Lessons = [
        {
          moduleId: mod2.id,
          title: "2.1 Logic Synthesis & Constraint Mapping",
          content: `This video lesson walks through translating RTL code (Verilog/SystemVerilog) into gate-level netlists. We focus on writing timing constraints (.sdc files), mapping to standard cell libraries, and optimizing for Area-Power-Performance trade-offs.`,
          contentType: "video",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          order: 1,
        },
        {
          moduleId: mod2.id,
          title: "2.2 Layout Placement & Floorplanning Labs",
          content: `Laboratory guide for core placement. Includes guidelines for placing macros, defining power pads, establishing the routing grid, and debugging early congestion hotspots.`,
          contentType: "text",
          order: 2,
        },
        {
          moduleId: mod2.id,
          title: "2.3 Live Lab: Clock Tree Synthesis Walkthrough",
          content: `Interactive live session focusing on clock tree routing. We will configure H-tree and mesh structures, analyze clock buffer insertion, and balance insertion delays to minimize dynamic skew.`,
          contentType: "live_class",
          zoomMeetingId: "912 3845 2912",
          zoomPasscode: "CTS_Lab_2026",
          order: 3,
        }
      ];

      const seededLessons1 = await db.insert(schema.lessons).values(mod1Lessons).returning();
      const seededLessons2 = await db.insert(schema.lessons).values(mod2Lessons).returning();

      // Quiz attached to the first lesson of Module 1
      const [quiz] = await db.insert(schema.quizzes).values({
        courseId: course.id,
        lessonId: seededLessons1[0].id,
        title: `${course.code} Assessment: Foundations Quiz`,
        description: "Evaluate your comprehensive understanding of the physical layout, transistor models, and timing stages.",
        passingScore: 60,
      }).returning();
      tenantQuizzes.push(quiz);

      const quizQuestionsList = [
        {
          quizId: quiz.id,
          questionText: "Which stage of the physical design flow is responsible for planning the power grid and placing I/O pads?",
          questionType: "mcq",
          options: [
            { id: "opt_a", text: "Global & Detail Routing" },
            { id: "opt_b", text: "Floorplanning & Placement" },
            { id: "opt_c", text: "Clock Tree Synthesis" },
            { id: "opt_d", text: "Physical Verification" }
          ],
          correctOptionId: "opt_b",
          order: 1,
        },
        {
          quizId: quiz.id,
          questionText: "What type of light source is primarily used in modern High-NA EUV lithography systems?",
          questionType: "mcq",
          options: [
            { id: "opt_a", text: "Argon Fluoride (ArF) Excimer Laser" },
            { id: "opt_b", text: "Laser-Produced Tin Plasma (13.5nm)" },
            { id: "opt_c", text: "Krypton Fluoride (KrF) Laser" },
            { id: "opt_d", text: "Mercury Arc Lamp" }
          ],
          correctOptionId: "opt_b",
          order: 2,
        },
        {
          quizId: quiz.id,
          questionText: "ASIC stands for which of the following?",
          questionType: "mcq",
          options: [
            { id: "opt_a", text: "Advanced Silicon Integrated Circuit" },
            { id: "opt_b", text: "Application-Specific Integrated Circuit" },
            { id: "opt_c", text: "All-Silicon Interface Controller" },
            { id: "opt_d", text: "Automated System Integration Chip" }
          ],
          correctOptionId: "opt_b",
          order: 3,
        },
        {
          quizId: quiz.id,
          questionText: "Clock Tree Synthesis (CTS) is performed to minimize which of the following parameters?",
          questionType: "mcq",
          options: [
            { id: "opt_a", text: "Power Grid Resistance" },
            { id: "opt_b", text: "Clock Skew and Delay" },
            { id: "opt_c", text: "Crosstalk Capacitance" },
            { id: "opt_d", text: "Gate Oxide Leakage" }
          ],
          correctOptionId: "opt_b",
          order: 4,
        },
        {
          quizId: quiz.id,
          questionText: "What is the primary function of cleanroom HEPA/ULPA filtration systems?",
          questionType: "mcq",
          options: [
            { id: "opt_a", text: "Prevent static electricity build-up" },
            { id: "opt_b", text: "Filter out microscopic airborne particulates" },
            { id: "opt_c", text: "Maintain absolute vacuum chambers" },
            { id: "opt_d", text: "Regulate the chemical composition of photoresist" }
          ],
          correctOptionId: "opt_b",
          order: 5,
        }
      ];

      await db.insert(schema.quizQuestions).values(quizQuestionsList);
    }

    // 9. Seed Jobs (Placement Module)
    console.log(`💼 Seeding Job Openings for ${tenant.name}...`);
    const jobsData = [
      {
        tenantId: tenant.id,
        title: "Silicon Verification Engineer",
        company: tenant.subdomain === "intel" ? "Intel Corporation" : tenant.subdomain === "amd" ? "AMD India" : "TSMC R&D",
        description: "Join the core design validation team. You will write UVM testbenches, run coverage-driven metrics, and verify sub-system blocks.",
        requirements: "Solid understanding of SystemVerilog, UVM, and assertion-based validation protocols. Experience with Synopsys VCS or Siemens Questa.",
        salary: "$110,000 - $135,000",
        location: "Austin, TX / Hillsboro, OR / Bangalore, IN",
        isActive: true,
        type: "job",
      },
      {
        tenantId: tenant.id,
        title: "Physical Design & Layout Engineer",
        company: tenant.subdomain === "intel" ? "Intel Labs" : tenant.subdomain === "amd" ? "AMD Radeon Group" : "TSMC Fab 18",
        description: "Responsible for floorplanning, clock tree synthesis (CTS), routing, and DRC/LVS physical sign-off at advanced nodes.",
        requirements: "Hands-on experience with Cadence Innovus or Synopsys ICC2. Knowledge of RC parasitics extraction and electro-migration limits.",
        salary: "$115,000 - $140,000",
        location: "San Jose, CA / Hsinchu, TW / Bangalore, IN",
        isActive: true,
        type: "job",
      },
      {
        tenantId: tenant.id,
        title: "EUV Lithography Process Specialist",
        company: tenant.subdomain === "intel" ? "Intel Fab Operations" : tenant.subdomain === "amd" ? "GlobalFoundries (Partner)" : "TSMC Fab 12",
        description: "Manage lithographic exposure processes inside cleanroom fabs. Tune source parameters and optical pellicle alignments.",
        requirements: "PhD or Master's in Physics, Material Science, or Optical Engineering. Experience with high-precision optical equipment.",
        salary: "$130,500 - $160,000",
        location: "Hsinchu, Taiwan / Hillsboro, OR",
        isActive: true,
        type: "job",
      },
      {
        tenantId: tenant.id,
        title: "VLSI Design Intern",
        company: tenant.subdomain === "intel" ? "Intel R&D Labs" : tenant.subdomain === "amd" ? "AMD India Design" : "TSMC Advanced Technology Development",
        description: "Looking for an internship trainee to participate in register-transfer level (RTL) coding, logic simulation, and micro-architecture specs validation.",
        requirements: "Basic knowledge of Verilog/VHDL, digital electronics principles, and scripting languages (Python/Tcl). Enrolled in a graduate program.",
        salary: "$3,500 / month",
        location: "Hillsboro, OR / San Jose, CA / Hsinchu, TW / Bangalore, IN",
        isActive: true,
        type: "internship",
      }
    ];

    const seededJobs = await db.insert(schema.jobPostings).values(jobsData).returning();

    // 10. Seed Job Applications & Notifications for Students
    console.log(`📨 Seeding Applications & Notifications for ${tenant.name} students...`);
    const tenantStudents = await db.select().from(schema.students).where(eq(schema.students.tenantId, tenant.id));
    
    for (const student of tenantStudents) {
      // Find user of this student to send notifications
      const [studentUser] = await db.select().from(schema.users).where(eq(schema.users.id, student.userId));
      if (!studentUser) continue;

      // Seed 2 Applications
      await db.insert(schema.jobApplications).values([
        {
          tenantId: tenant.id,
          studentId: student.id,
          jobId: seededJobs[0].id,
          resumeUrl: "https://drive.google.com/file/d/sample-resume-doc/view",
          status: "interviewing",
        },
        {
          tenantId: tenant.id,
          studentId: student.id,
          jobId: seededJobs[1].id,
          resumeUrl: "https://drive.google.com/file/d/sample-resume-doc/view",
          status: "applied",
        }
      ]);

      // Seed Notifications
      await db.insert(schema.notifications).values([
        {
          tenantId: tenant.id,
          userId: studentUser.id,
          title: "Welcome to the Center of Excellence!",
          message: "Your application is approved and student profile is active. Get started with your learning courses.",
          type: "success",
          isRead: true,
        },
        {
          tenantId: tenant.id,
          userId: studentUser.id,
          title: "Interview Shortlist: Silicon Verification",
          message: "Congratulations! You have been shortlisted for an interview. Please prepare your system validation notes.",
          type: "success",
          isRead: false,
        },
        {
          tenantId: tenant.id,
          userId: studentUser.id,
          title: "Upcoming Class Reminder",
          message: "Live Session '1.3 Live Seminar: Advanced Physical Modeling' starts in 2 hours.",
          type: "info",
          isRead: false,
        }
      ]);
    }

    // Seed Linus Torvalds for Intel
    if (tenant.subdomain === "intel") {
      const [linusUser] = await db.insert(schema.users).values({
        tenantId: tenant.id,
        firstName: "Linus",
        lastName: "Torvalds",
        email: "linus.torvalds@student.intel.com",
        passwordHash,
        role: "Student",
        customRoleId: roleMap.get("Student"),
        status: "active",
      }).returning();

      const intelBatch = seededBatches[0];
      const [linusStudent] = await db.insert(schema.students).values({
        tenantId: tenant.id,
        userId: linusUser.id,
        batchId: intelBatch.id,
        rollNumber: `ME-INTEL-26-0011`,
        admissionNumber: `ADM-INTEL-26-0011`,
      }).returning();

      // Seed Linus Applications
      await db.insert(schema.jobApplications).values([
        {
          tenantId: tenant.id,
          studentId: linusStudent.id,
          jobId: seededJobs[0].id,
          resumeUrl: "https://drive.google.com/file/d/linus-torvalds-resume/view",
          status: "interviewing",
        },
        {
          tenantId: tenant.id,
          studentId: linusStudent.id,
          jobId: seededJobs[1].id,
          resumeUrl: "https://drive.google.com/file/d/linus-torvalds-resume/view",
          status: "offered",
        }
      ]);

      // Seed Linus Certificates
      await db.insert(schema.certificates).values([
        {
          tenantId: tenant.id,
          studentId: linusStudent.id,
          courseId: seededCourses[0].id,
          certificateCode: `CERT-VLSI-${linusUser.lastName.toUpperCase()}-SEED123`,
          metadata: {
            avgScore: 94,
            grade: "A+",
            digitalSignature: "0xHASHED_SIGNATURE_DATA_SEEDED"
          }
        }
      ]);

      // Seed Linus Notifications
      await db.insert(schema.notifications).values([
        {
          tenantId: tenant.id,
          userId: linusUser.id,
          title: "🎉 Job Offer Extended!",
          message: "Congratulations! Intel Labs has extended you an offer for the Physical Design & Layout Engineer role.",
          type: "success",
          isRead: false,
        },
        {
          tenantId: tenant.id,
          userId: linusUser.id,
          title: "Welcome to the Center of Excellence!",
          message: "Your application is approved and student profile is active.",
          type: "success",
          isRead: true,
        }
      ]);
    }

    // Seed Quiz Attempts for all approved students of this tenant
    console.log(`📝 Seeding Quiz Attempts for ${tenant.name}...`);
    const tenantStudentsForQuiz = await db.select().from(schema.students).where(eq(schema.students.tenantId, tenant.id));
    for (const student of tenantStudentsForQuiz) {
      for (const quiz of tenantQuizzes) {
        // Deterministic score based on student's roll suffix, but within passing range mostly
        const hashVal = student.rollNumber ? student.rollNumber.charCodeAt(student.rollNumber.length - 1) : 5;
        const score = 55 + (hashVal % 9) * 5; // Scores: 55, 60, 65, 70, 75, 80, 85, 90, 95
        const passed = score >= quiz.passingScore;
        await db.insert(schema.quizAttempts).values({
          tenantId: tenant.id,
          studentId: student.id,
          quizId: quiz.id,
          score,
          passed,
        });
      }
    }
  }

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
