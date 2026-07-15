import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";

// Helper to wrap text and draw paragraphs in pdf-lib
function drawParagraph(
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  fontSize: number,
  lineHeight: number,
  color = rgb(0.2, 0.2, 0.2)
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + " ";
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth) {
      page.drawText(line.trim(), { x, y: currentY, size: fontSize, font, color });
      line = word + " ";
      currentY -= lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    page.drawText(line.trim(), { x, y: currentY, size: fontSize, font, color });
    currentY -= lineHeight;
  }
  return currentY;
}

// Generate high-fidelity portrait PDFs for documents and landscape PDFs for presentations
async function generateMockPDF(
  title: string,
  author: string,
  tenantName: string,
  category: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const isLandscape = category === "ppt";
  const pageSize: [number, number] = isLandscape ? [842, 595] : [595, 842];
  const width = pageSize[0];
  const height = pageSize[1];

  const watermarkText = `PROPERTY OF ${tenantName.toUpperCase()} - DO NOT DISTRIBUTE`;

  const drawWatermarks = (page: any) => {
    // 1. Diagonal Watermark
    page.drawText(watermarkText, {
      x: width / 12,
      y: height / 3,
      size: Math.min(width, height) / 22,
      font: fontBold,
      color: rgb(0.85, 0.85, 0.85),
      opacity: 0.18,
      rotate: degrees(isLandscape ? 25 : 35),
    });

    // 2. Footer Watermark
    page.drawText(`Downloaded from ${tenantName} LMS. Watermarked copy. Authorized user only.`, {
      x: 25,
      y: 20,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.6,
    });
  };

  if (isLandscape) {
    // ---- Slide Presentation Layout (Landscape) ----
    // Slide 1: Cover Slide
    let page = pdfDoc.addPage(pageSize);
    page.drawRectangle({
      x: 0,
      y: height - 80,
      width: width,
      height: 80,
      color: rgb(0.0, 0.25, 0.5),
    });
    page.drawText(`${tenantName.toUpperCase()} • TECHNICAL SEMINAR SERIES`, {
      x: 40,
      y: height - 45,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    let titleY = height - 160;
    titleY = drawParagraph(page, title, 40, titleY, width - 80, fontBold, 24, 30, rgb(0.1, 0.15, 0.3));

    page.drawText(`Presenter/Author: ${author || "Instructional Faculty Group"}`, {
      x: 40,
      y: titleY - 25,
      size: 12,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText("CLASSIFICATION: FOR AUTHORIZED INTERNAL STUDENT USE ONLY", {
      x: 40,
      y: 120,
      size: 10,
      font: fontBold,
      color: rgb(0.7, 0.2, 0.2),
    });

    drawParagraph(
      page,
      "This slide presentation outlines key roadmap architectures, physical scaling challenges, and design rule constraints covered in our microelectronics program syllabus. Downloaded copy belongs strictly to the authenticated student.",
      40,
      90,
      width - 80,
      fontRegular,
      9.5,
      14,
      rgb(0.3, 0.3, 0.3)
    );

    drawWatermarks(page);

    // Slide 2: Core Agenda
    page = pdfDoc.addPage(pageSize);
    page.drawText("Agenda & Technology Roadmap", {
      x: 40,
      y: height - 60,
      size: 18,
      font: fontBold,
      color: rgb(0.0, 0.25, 0.5),
    });
    page.drawLine({
      start: { x: 40, y: height - 70 },
      end: { x: width - 40, y: height - 70 },
      thickness: 1.5,
      color: rgb(0.0, 0.25, 0.5),
    });

    let currentY = height - 110;
    const bullets = [
      "Introduction to Advanced Microelectronics Node Scaling Constraints",
      "Transition from Planar Bulk MOSFETs to 3D Multi-Gate Architectures (FinFETs)",
      "Nanosheet Gate-All-Around (GAA) Transistor Electrostatics & Manufacturing Path",
      "Immersion Lithography vs Extreme Ultraviolet (EUV) Multi-Patterning Limits",
      "Interconnect RC Delay Bottlenecks & Low-k Dielectric Integration Keys"
    ];
    for (const bullet of bullets) {
      page.drawText("•", { x: 40, y: currentY, size: 12, font: fontBold, color: rgb(0.0, 0.25, 0.5) });
      currentY = drawParagraph(page, bullet, 55, currentY, width - 90, fontRegular, 11, 16) - 10;
    }

    drawWatermarks(page);

    // Slide 3: Nanosheet GAA Technology
    page = pdfDoc.addPage(pageSize);
    page.drawText("Nanosheet GAA Transistors (Sub-3nm Scaling)", {
      x: 40,
      y: height - 60,
      size: 18,
      font: fontBold,
      color: rgb(0.0, 0.25, 0.5),
    });
    page.drawLine({
      start: { x: 40, y: height - 70 },
      end: { x: width - 40, y: height - 70 },
      thickness: 1.5,
      color: rgb(0.0, 0.25, 0.5),
    });

    currentY = height - 100;
    const sections = [
      {
        heading: "1. Electrostatic Control Optimization",
        text: "By wrapping the gate electrode completely around all four sides of the channel nanosheets, Gate-All-Around (GAA) devices reduce drain-induced barrier lowering (DIBL) and eliminate sub-surface leakage paths present in older planar nodes."
      },
      {
        heading: "2. Nanosheet Stack Engineering",
        text: "The channel consists of vertically stacked Silicon (Si) nanosheets, released by selectively etching sacrificial Silicon-Germanium (SiGe) spacer layers. Wide sheets provide higher drive current (Ion), while narrow sheets optimize packing density."
      },
      {
        heading: "3. Inner Spacer Integration",
        text: "A key manufacturing step is the formation of inner spacers to decrease parasitic capacitance between the gate and source/drain regions, preserving high frequency performance."
      }
    ];

    for (const sec of sections) {
      page.drawText(sec.heading, { x: 40, y: currentY, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      currentY -= 15;
      currentY = drawParagraph(page, sec.text, 40, currentY, width - 80, fontRegular, 9.5, 14) - 15;
    }

    drawWatermarks(page);
  } else {
    // ---- Document Layout (Portrait for Books/Manuals/Worksheets) ----
    // Page 1: Cover Page
    let page = pdfDoc.addPage(pageSize);
    
    // Draw top header block
    page.drawRectangle({
      x: 0,
      y: height - 140,
      width: width,
      height: 140,
      color: rgb(0.05, 0.15, 0.3),
    });

    page.drawText(tenantName.toUpperCase(), {
      x: 40,
      y: height - 60,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText("DIGITAL REFERENCE LIBRARY", {
      x: 40,
      y: height - 85,
      size: 12,
      font: fontRegular,
      color: rgb(0.7, 0.8, 0.9),
    });

    page.drawText(category.replace("_", " ").toUpperCase(), {
      x: 40,
      y: height - 200,
      size: 11,
      font: fontBold,
      color: rgb(0.7, 0.2, 0.2),
    });

    // Wrapped Title
    let titleY = height - 230;
    titleY = drawParagraph(page, title, 40, titleY, width - 80, fontBold, 20, 26, rgb(0.05, 0.15, 0.3));

    page.drawText(`Principal Author: ${author || "Technical Advisory Board"}`, {
      x: 40,
      y: titleY - 20,
      size: 11,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(`Published: July 2026`, {
      x: 40,
      y: titleY - 38,
      size: 10,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawLine({
      start: { x: 40, y: titleY - 55 },
      end: { x: width - 40, y: titleY - 55 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Notice Box
    page.drawRectangle({
      x: 40,
      y: 80,
      width: width - 80,
      height: 120,
      color: rgb(0.96, 0.96, 0.96),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    page.drawText("RESTRICTED DISTRIBUTION NOTICE", {
      x: 60,
      y: 175,
      size: 10,
      font: fontBold,
      color: rgb(0.7, 0.2, 0.2),
    });

    drawParagraph(
      page,
      `This reference documentation is property of the ${tenantName} educational archives. It is licensed exclusively to enrolled students for academic research and training coursework. Redistribution, digital copying, or public posting of this document is strictly prohibited and constitutes a violation of institutional academic integrity codes.`,
      60,
      155,
      width - 120,
      fontRegular,
      9,
      13,
      rgb(0.3, 0.3, 0.3)
    );

    drawWatermarks(page);

    // Page 2: Detailed Technical Article Content
    page = pdfDoc.addPage(pageSize);
    page.drawText("TECHNICAL REFERENCE DOCUMENTATION", {
      x: 40,
      y: height - 50,
      size: 10,
      font: fontBold,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText("Core Principles & Methodology", {
      x: 40,
      y: height - 75,
      size: 16,
      font: fontBold,
      color: rgb(0.05, 0.15, 0.3),
    });

    page.drawLine({
      start: { x: 40, y: height - 85 },
      end: { x: width - 40, y: height - 85 },
      thickness: 1,
      color: rgb(0.05, 0.15, 0.3),
    });

    let contentY = height - 110;
    
    let paragraphs = [
      "The scaling of semiconductor logic circuits has historically driven progress across computer architectures and solid-state systems. As physical dimensions of silicon transistors approach atomic limits, standard planar CMOS processes encounter severe challenges including source-to-drain quantum tunneling, excessive gate oxide leakage, and poor electrostatic control over the conduction channel.",
      "To combat these limitations, the industry successfully transitioned to 3D multi-gate FinFET architectures at the 22nm node, raising the channel vertically like a fin to allow the gate to wrap around three sides. However, at sub-3nm nodes, even FinFETs lose electrostatic authority. The next critical step is Gate-All-Around (GAA) structures, where horizontal silicon nanosheets are completely enclosed by the high-k metal gate stack.",
      "From a design perspective, parasitics optimization becomes the primary speed bottleneck. Resistance and capacitance in contact layers, metal lines, and transistor junctions (Rds, Cg, Cpin) restrict performance. Designers use precise mathematical formulas to estimate gate capacitance charge limits and design rule compliance (DRC) parameters to optimize layout layouts for EUV multi-patterning lithography."
    ];

    if (title.toLowerCase().includes("euv") || title.toLowerCase().includes("lithography")) {
      paragraphs = [
        "Extreme Ultraviolet (EUV) Lithography represents the pinnacle of modern nanolithography systems. Utilizing light with a wavelength of 13.5nm produced by vaporizing tin droplets with high-power CO2 lasers, EUV enables the patterning of features down to single-digit nanometer resolutions.",
        "Unlike conventional deep ultraviolet (DUV) lithography which uses refractive glass lenses, EUV light is absorbed by almost all materials, including air and glass. Therefore, EUV scanners operate in a high vacuum environment and use highly precise reflective mirrors coated with molybdenum-silicon (Mo/Si) multilayer stacks.",
        "Pellicles—extremely thin membranes suspended above the photomask to prevent dust particle contamination—must be engineered from materials like carbon nanotubes or silicon-based compounds that exhibit high EUV transmittance while withstanding intense thermal loads during wafer exposure."
      ];
    } else if (title.toLowerCase().includes("parasitic") || title.toLowerCase().includes("excel") || title.toLowerCase().includes("spreadsheet")) {
      paragraphs = [
        "Transistor Parasitics are unwanted resistances, capacitances, and inductances inherent to physical semiconductor layouts. In high-speed VLSI routing, layout parasitic extraction (LPE) is crucial to verify that timing specifications are met.",
        "The gate capacitance (Cg) is the sum of intrinsic gate-to-channel capacitance (Cgc) and extrinsic overlap/fringing capacitances (Cov, Cfr). While intrinsic capacitance determines the active drive current, overlap and fringing fields are parasitic and degrade switching speeds without aiding conduction.",
        "Resistance parasitics include contact resistance at metal-silicide interfaces and source/drain extension (SDE) access resistances. Mitigating these parasitics requires optimizing the doping profiles of junctions, adopting advanced contact schemes like pre-contact silicide engineering, and selecting low-resistivity contact metals like cobalt or ruthenium."
      ];
    }

    for (const para of paragraphs) {
      contentY = drawParagraph(page, para, 40, contentY, width - 80, fontRegular, 9.5, 14.5) - 15;
    }

    contentY -= 5;
    page.drawRectangle({
      x: 40,
      y: contentY - 50,
      width: width - 80,
      height: 60,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1,
    });

    page.drawText("KEY TRANSISTOR SCALING EQUATION:", {
      x: 55,
      y: contentY - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });

    page.drawText("Propagation Delay (Tpd) = (C_total * V_dd) / I_on", {
      x: 55,
      y: contentY - 30,
      size: 11,
      font: fontBold,
      color: rgb(0.05, 0.1, 0.2),
    });

    page.drawText("Where C_total includes gate, overlap, and interconnect parasitic capacitances.", {
      x: 55,
      y: contentY - 43,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    drawWatermarks(page);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Generate high-quality CSV spreadsheet contents containing actual calculations
function generateMockSpreadsheet(title: string, tenantName: string): Buffer {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  
  let csv = "";
  csv += `================================================================================\n`;
  csv += `WATERMARK: PROPERTY OF ${tenantName.toUpperCase()} - CONFIDENTIAL - DO NOT DISTRIBUTE\n`;
  csv += `Downloaded from: ${tenantName} LMS Archive\n`;
  csv += `Download Timestamp: ${timestamp}\n`;
  csv += `Security Access ID: SEC-LMS-${Math.floor(100000 + Math.random() * 900000)}\n`;
  csv += `================================================================================\n\n`;

  if (title.toLowerCase().includes("timing") || title.toLowerCase().includes("slack") || title.toLowerCase().includes("1.4")) {
    csv += `"STATIC TIMING ANALYSIS & SLACK CALCULATION WORKSHEET"\n\n`;
    csv += `"Timing Path ID","Startpoint","Endpoint","Clock Skew (Tskew)","Clock Jitter (Tjitter)","Data Path Delay (Tdp)","Required Time (Treq)","Arrival Time (Tarr)","Slack (Treq - Tarr)","Status / Action Required"\n`;
    csv += `"PATH_001","Reg_A/CLK","Reg_B/D",0.020,0.015,0.240,0.350,0.285,0.065,"MET (Pass)"\n`;
    csv += `"PATH_002","Reg_A/CLK","Reg_C/D",-0.010,0.015,0.310,0.350,0.345,0.005,"MET (Critical - Monitor)"\n`;
    csv += `"PATH_003","Reg_B/CLK","Reg_D/D",0.030,0.015,0.380,0.350,0.395,-0.045,"VIOLATION (Fail - Redesign Path)"\n`;
    csv += `"PATH_004","Reg_C/CLK","Reg_E/D",0.000,0.015,0.180,0.350,0.225,0.125,"MET (Pass)"\n`;
    csv += `"PATH_005","Reg_D/CLK","Reg_F/D",0.010,0.015,0.295,0.350,0.330,0.020,"MET (Pass)"\n\n`;
    
    csv += `"Calculated Timing Constraints Summary"\n`;
    csv += `"Total Checked Paths",5\n`;
    csv += `"Critical Paths (< 10ps slack)",1\n`;
    csv += `"Violating Paths (< 0ps slack)",1\n`;
    csv += `"Worst Negative Slack (WNS)",-0.045,"ns"\n`;
  } else {
    csv += `"TRANSISTOR PARASITICS CALCULATION MODEL - METRICS ANALYSIS GRID"\n\n`;
    csv += `"Parameter","Symbol","Planar 28nm","FinFET 7nm","GAA 3nm","Unit","Formula / Calculation"\n`;
    csv += `"Gate Oxide Thickness","Tox",1.2,0.95,0.78,"nm","EOT equivalent"\n`;
    csv += `"Gate Capacitance","Cg",1.45,2.1,2.85,"fF/um","Cg = (Eps * W * L) / Tox"\n`;
    csv += `"Drain Source Resistance","Rds",140,95,78,"Ohm","Channel resistance"\n`;
    csv += `"Subthreshold Swing","SS",85,68,62,"mV/dec","SS = ln(10)*(kT/q)*(1 + Cd/Ci)"\n`;
    csv += `"Gate Leakage Current","Igate",1.2e-9,4.5e-11,1.2e-11,"A/um2","Quantum tunneling limit"\n2\n`;
    csv += `"Propagation Delay","Tpd",12,4.8,2.1,"ps","Tpd = (Cg * Vdd) / Ion"\n`;
    csv += `"Supply Voltage","Vdd",1.1,0.75,0.65,"V","Standard Vdd scale"\n\n`;

    csv += `"Calculated Performance Metrics"\n`;
    csv += `"Power-Delay Product","PDP",1.595,0.36,0.1365,"fJ","PDP = Cg * Vdd^2"\n`;
    csv += `"Energy Reduction vs Planar","Energy","-","77.4%","91.4%","%","1 - (PDP_new / PDP_planar)"\n`;
  }

  return Buffer.from(csv, "utf-8");
}

// Generate PDF Transcript specifically for the audio podcast file
async function generateMockTranscriptPDF(title: string, tenantName: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // Top banner
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width: width,
    height: 120,
    color: rgb(0.1, 0.4, 0.4),
  });

  page.drawText(tenantName.toUpperCase(), {
    x: 40,
    y: height - 55,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("AUDIO BRIEFING OFFICIAL TRANSCRIPT", {
    x: 40,
    y: height - 80,
    size: 11,
    font: fontRegular,
    color: rgb(0.8, 0.9, 0.9),
  });

  page.drawText(title, {
    x: 40,
    y: height - 165,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.2),
  });

  page.drawText("Transcript of Cleanroom Safety & Contamination Control audio briefing", {
    x: 40,
    y: height - 185,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  const text = 
    "[00:01] Speaker: Welcome to the Semiconductor Cleanroom Protocol Briefing. Today, we review the absolute fundamentals of contamination control and safety garment procedures. In a class-10 cleanroom, the air contains no more than ten particles of size 0.5 microns or larger per cubic foot. Human operators are the largest source of particulate contaminants. Therefore, gowning compliance is your first line of defense.\n\n" +
    "[00:45] Speaker: The gowning sequence must be performed in strict order. First, step onto the sticky mat to remove debris from footwear. Put on the bouffant cap, ensuring all hair is covered. Second, put on the cleanroom hood and secure the snaps. Third, gown into the coverall jumpsuit without letting the sleeves or legs touch the floor. Cleanliness of the suit exterior is paramount.\n\n" +
    "[01:30] Speaker: Finally, pull on the boot cover booties over your shoes, step across the bench onto the clean side, and put on sterile nitrile gloves. Ensure gloves are pulled over the sleeves of the coverall. Air filtration inside the cleanroom relies on vertical laminar flow, passing clean air down through high-efficiency particulate air or HEPA filters and exhausting it through grated floor vents. Keep your workspace clear and report any pressure drop alarms immediately.";

  const lines = text.split("\n\n");
  let contentY = height - 220;
  for (const para of lines) {
    contentY = drawParagraph(page, para, 40, contentY, width - 80, fontRegular, 9.5, 14.5) - 15;
  }

  // Draw watermarks
  page.drawText(`PROPERTY OF ${tenantName.toUpperCase()} - DO NOT DISTRIBUTE`, {
    x: width / 12,
    y: height / 3,
    size: 22,
    font: fontBold,
    color: rgb(0.85, 0.85, 0.85),
    opacity: 0.18,
    rotate: degrees(35),
  });

  page.drawText(`Downloaded from ${tenantName} LMS. Watermarked Copy. Authorized user only.`, {
    x: 25,
    y: 20,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
    opacity: 0.6,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Package actual MP3 audio and watermarked PDF transcript into a ZIP archive
async function packageAudioZIP(title: string, tenantName: string): Promise<Buffer> {
  const zip = new AdmZip();

  // Load actual local MP3 file
  const audioPath = path.join(process.cwd(), "public", "sample-audio.mp3");
  let audioBuffer: Buffer;
  if (fs.existsSync(audioPath)) {
    audioBuffer = fs.readFileSync(audioPath);
  } else {
    audioBuffer = Buffer.alloc(0);
  }

  const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
  zip.addFile(`${cleanTitle}_Briefing.mp3`, audioBuffer);

  // Generate and pack watermarked transcript
  const transcriptPdfBytes = await generateMockTranscriptPDF(title, tenantName);
  zip.addFile(`${cleanTitle}_Official_Transcript_Watermarked.pdf`, transcriptPdfBytes);

  return zip.toBuffer();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const lessonId = searchParams.get("lessonId");

    if (!id && !lessonId) {
      return new Response("Missing resource ID or lesson ID", { status: 400 });
    }

    let item: { title: string; category: string; tenantId: string; author?: string | null } | null = null;

    if (lessonId) {
      let resolvedLessonId = lessonId;

      // Check if this lessonId is actually a courseId
      const matchedCourse = await db.query.courses.findFirst({
        where: eq(schema.courses.id, lessonId),
      });

      if (matchedCourse) {
        const courseModules = await db.query.modules.findMany({
          where: eq(schema.modules.courseId, matchedCourse.id),
        });
        const sortedModules = [...courseModules].sort((a, b) => (a.order || 0) - (b.order || 0));
        const firstModule = sortedModules[0];
        if (firstModule) {
          const moduleLessons = await db.query.lessons.findMany({
            where: eq(schema.lessons.moduleId, firstModule.id),
          });
          const sortedLessons = [...moduleLessons].sort((a, b) => (a.order || 0) - (b.order || 0));
          const firstLesson = sortedLessons[0];
          if (firstLesson) {
            resolvedLessonId = firstLesson.id;
          }
        }
      }

      // 1. Fetch lesson details
      const lesson = await db.query.lessons.findFirst({
        where: eq(schema.lessons.id, resolvedLessonId),
      });

      if (!lesson) {
        return new Response("Lesson not found", { status: 404 });
      }

      // 2. Resolve module, course, and tenant for the lesson
      const mod = await db.query.modules.findFirst({
        where: eq(schema.modules.id, lesson.moduleId),
      });

      if (!mod) {
        return new Response("Module not found", { status: 404 });
      }

      const course = await db.query.courses.findFirst({
        where: eq(schema.courses.id, mod.courseId),
      });

      if (!course) {
        return new Response("Course not found", { status: 404 });
      }

      const isExcel = lesson.title.includes("1.4") || lesson.title.toLowerCase().includes("timing analysis");

      item = {
        title: lesson.title,
        category: isExcel ? "excel" : "worksheet", // Course lessons serve watermarked PDF worksheets
        tenantId: course.tenantId,
        author: "Instructional Faculty Group",
      };
    } else if (id) {
      // Fetch library item details
      const libItem = await db.query.digitalLibrary.findFirst({
        where: eq(schema.digitalLibrary.id, id),
      });

      if (!libItem) {
        return new Response("Resource not found", { status: 404 });
      }

      item = {
        title: libItem.title,
        category: libItem.category,
        tenantId: libItem.tenantId,
        author: libItem.author,
      };
    }

    if (!item) {
      return new Response("Resource not resolved", { status: 404 });
    }

    // 2. Resolve active tenant details
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, item.tenantId),
    });

    const tenantSubdomain = tenant?.subdomain || "platform";
    const tenantName = tenant?.name || "LMS Platform";

    // 3. Fetch original or generate locally
    let fileBuffer: Buffer;
    let extension = "pdf";
    let contentType = "application/pdf";

    if (item.fileUrl && (item.fileUrl.startsWith("http://") || item.fileUrl.startsWith("https://") || item.fileUrl.startsWith("/materials/") || item.fileUrl.startsWith("materials/"))) {
      console.log(`[DOWNLOAD API] Fetching original file from: ${item.fileUrl}`);
      if (item.fileUrl.startsWith("http://") || item.fileUrl.startsWith("https://")) {
        const fileResponse = await fetch(item.fileUrl);
        if (!fileResponse.ok) {
          return new NextResponse("Failed to download original resource file", { status: 502 });
        }
        contentType = fileResponse.headers.get("content-type") || "application/octet-stream";
        const arrayBuffer = await fileResponse.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        const originalFilename = item.fileUrl.split("/").pop()?.split("?")[0] || "document.pdf";
        extension = originalFilename.split(".").pop()?.toLowerCase() || "pdf";
      } else {
        // Relative local file path (e.g. /materials/weste-harris.pdf)
        const path = await import("path");
        const fs = await import("fs");
        const cleanPath = item.fileUrl.startsWith("/") ? item.fileUrl.substring(1) : item.fileUrl;
        const filePath = path.join(process.cwd(), "public", cleanPath);
        if (!fs.existsSync(filePath)) {
          console.error(`[DOWNLOAD API] Local file not found: ${filePath}`);
          return new NextResponse("Local resource file not found", { status: 404 });
        }
        fileBuffer = fs.readFileSync(filePath);
        const originalFilename = path.basename(filePath);
        extension = originalFilename.split(".").pop()?.toLowerCase() || "pdf";
        contentType = extension === "pdf" ? "application/pdf" : "application/octet-stream";
      }

      // Perform type-specific watermarking for fetched file
      if (extension === "pdf") {
        try {
          console.log(`[DOWNLOAD API] Watermarking PDF using pdf-lib for tenant: "${tenantName}"`);
          const pdfDoc = await PDFDocument.load(fileBuffer);
          const pages = pdfDoc.getPages();
          const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const watermarkText = `PROPERTY OF ${tenantName.toUpperCase()} - DO NOT DISTRIBUTE`;

          for (const page of pages) {
            const { width, height } = page.getSize();
            page.drawText(watermarkText, {
              x: width / 12,
              y: height / 3,
              size: Math.min(width, height) / 22,
              font: helveticaFont,
              color: rgb(0.7, 0.7, 0.7),
              opacity: 0.18,
              rotate: degrees(35),
            });
            page.drawText(`Downloaded from ${tenantName} LMS. Watermarked copy.`, {
              x: 20,
              y: 15,
              size: 8,
              font: helveticaFont,
              color: rgb(0.5, 0.5, 0.5),
              opacity: 0.5,
            });
          }
          const modifiedBytes = await pdfDoc.save();
          fileBuffer = Buffer.from(modifiedBytes);
        } catch (pdfErr) {
          console.error("[DOWNLOAD API] Error during PDF watermarking:", pdfErr);
        }
      } else if (["csv", "txt"].includes(extension)) {
        try {
          const text = fileBuffer.toString("utf-8");
          const watermarkHeader = `[CONFIDENTIAL - PROPERTY OF ${tenantName.toUpperCase()} - FOR AUTHORIZED USE ONLY]\n\n`;
          fileBuffer = Buffer.from(watermarkHeader + text, "utf-8");
        } catch (txtErr) {
          console.error("[DOWNLOAD API] Error watermarking text file:", txtErr);
        }
      }
    } else {
      // Generate dynamically based on category
      if (item.category === "excel") {
        console.log(`[DOWNLOAD API] Generating watermarked Excel spreadsheet locally for: ${item.title}`);
        fileBuffer = generateMockSpreadsheet(item.title, tenantName);
        extension = "csv";
        contentType = "text/csv";
      } else if (item.category === "audio") {
        console.log(`[DOWNLOAD API] Packaging audio briefing ZIP locally for: ${item.title}`);
        fileBuffer = await packageAudioZIP(item.title, tenantName);
        extension = "zip";
        contentType = "application/zip";
      } else {
        console.log(`[DOWNLOAD API] Generating watermarked PDF document locally for: ${item.title} (Category: ${item.category})`);
        fileBuffer = await generateMockPDF(item.title, item.author || "Instructional Faculty Group", tenantName, item.category);
        extension = "pdf";
        contentType = "application/pdf";
      }
    }

    const cleanTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    const downloadFilename = `[${tenantSubdomain}_watermarked]_${cleanTitle}.${extension}`;

    // 4. Construct HTTP response with attachment headers
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${downloadFilename}"`);
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", String(fileBuffer.length));
    headers.set("X-Watermarked-By", tenantName);

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[DOWNLOAD API] Global error in download route:", error);
    return new Response(error?.message || "Internal server error during download", { status: 500 });
  }
}
