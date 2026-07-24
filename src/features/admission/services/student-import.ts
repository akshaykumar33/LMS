import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface ImportStudentRow {
  firstName: string;
  lastName: string;
  email: string;
  rollNumber: string;
  admissionNumber: string;
  password: string; // Required
  highestEducation: string; // Required
  collegeInstitution: string; // Required
  gpaCgpa: string; // Required
  docNames: string; // Required (comma-separated)
  docLinks: string; // Required (comma-separated)
}

export interface ImportError {
  row: number;
  email?: string;
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: ImportError[];
}

export async function validateAndImportStudents(
  tenantId: string,
  batchId: string,
  rows: ImportStudentRow[]
): Promise<ImportResult> {
  const errors: ImportError[] = [];
  
  if (!rows || rows.length === 0) {
    return { success: false, importedCount: 0, errors: [{ row: 0, field: "file", message: "No data rows provided" }] };
  }

  // 1. Local batch uniqueness checks
  const seenEmails = new Set<string>();
  const seenRolls = new Set<string>();
  const seenAdmissions = new Set<string>();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validRows: { rowData: ImportStudentRow; rowIdx: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Check required basic fields
    if (!row.firstName?.trim()) {
      errors.push({ row: rowNum, field: "firstName", message: "First Name is required" });
    }
    if (!row.lastName?.trim()) {
      errors.push({ row: rowNum, field: "lastName", message: "Last Name is required" });
    }
    
    // Email checks
    if (!row.email?.trim()) {
      errors.push({ row: rowNum, field: "email", message: "Email is required" });
    } else {
      const email = row.email.trim().toLowerCase();
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNum, email, field: "email", message: "Invalid email format" });
      } else if (seenEmails.has(email)) {
        errors.push({ row: rowNum, email, field: "email", message: "Duplicate email in upload batch" });
      } else {
        seenEmails.add(email);
      }
    }

    // Roll number checks
    if (!row.rollNumber?.trim()) {
      errors.push({ row: rowNum, field: "rollNumber", message: "Roll Number is required" });
    } else {
      const roll = row.rollNumber.trim();
      if (seenRolls.has(roll)) {
        errors.push({ row: rowNum, field: "rollNumber", message: "Duplicate Roll Number in upload batch" });
      } else {
        seenRolls.add(roll);
      }
    }

    // Admission number checks
    if (!row.admissionNumber?.trim()) {
      errors.push({ row: rowNum, field: "admissionNumber", message: "Admission Number is required" });
    } else {
      const adm = row.admissionNumber.trim();
      if (seenAdmissions.has(adm)) {
        errors.push({ row: rowNum, field: "admissionNumber", message: "Duplicate Admission Number in upload batch" });
      } else {
        seenAdmissions.add(adm);
      }
    }

    // Password is now strictly required!
    if (!row.password?.trim()) {
      errors.push({ row: rowNum, field: "password", message: "Password is required for student accounts" });
    }

    // Academic & Document columns required
    if (!row.highestEducation?.trim()) {
      errors.push({ row: rowNum, field: "highestEducation", message: "Highest Education is required" });
    }
    if (!row.collegeInstitution?.trim()) {
      errors.push({ row: rowNum, field: "collegeInstitution", message: "College / Institution is required" });
    }
    if (!row.gpaCgpa?.trim()) {
      errors.push({ row: rowNum, field: "gpaCgpa", message: "GPA / CGPA is required" });
    }
    if (!row.docNames?.trim()) {
      errors.push({ row: rowNum, field: "docNames", message: "Document Names are required" });
    }
    if (!row.docLinks?.trim()) {
      errors.push({ row: rowNum, field: "docLinks", message: "Document Links are required" });
    }

    // Stop checking this row if it has basic structure/duplication errors
    if (errors.some(e => e.row === rowNum)) {
      continue;
    }

    validRows.push({
      rowData: row,
      rowIdx: rowNum
    });
  }

  if (errors.length > 0) {
    return { success: false, importedCount: 0, errors };
  }

  // 2. Query database for existing duplicates (within the tenant)
  try {
    const emailsToCheck = Array.from(seenEmails);
    const rollsToCheck = Array.from(seenRolls);
    const admissionsToCheck = Array.from(seenAdmissions);

    const existingUsers = await db.query.users.findMany({
      where: and(
        eq(schema.users.tenantId, tenantId),
        inArray(schema.users.email, emailsToCheck)
      )
    });

    const existingStudents = await db.query.students.findMany({
      where: and(
        eq(schema.students.tenantId, tenantId),
        inArray(schema.students.rollNumber, rollsToCheck)
      )
    });

    const existingAdmissions = await db.query.students.findMany({
      where: and(
        eq(schema.students.tenantId, tenantId),
        inArray(schema.students.admissionNumber, admissionsToCheck)
      )
    });

    const dbUserEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const dbRolls = new Set(existingStudents.map(s => s.rollNumber));
    const dbAdmissions = new Set(existingAdmissions.map(s => s.admissionNumber));

    for (const item of validRows) {
      const { rowData, rowIdx } = item;
      const email = rowData.email.trim().toLowerCase();
      const roll = rowData.rollNumber.trim();
      const adm = rowData.admissionNumber.trim();

      if (dbUserEmails.has(email)) {
        errors.push({ row: rowIdx, email, field: "email", message: "Email already registered in system" });
      }
      if (dbRolls.has(roll)) {
        errors.push({ row: rowIdx, field: "rollNumber", message: "Roll Number already registered in system" });
      }
      if (dbAdmissions.has(adm)) {
        errors.push({ row: rowIdx, field: "admissionNumber", message: "Admission Number already registered in system" });
      }
    }

    if (errors.length > 0) {
      return { success: false, importedCount: 0, errors };
    }

    // 3. Resolve the "Student" role ID
    const studentRole = await db.query.roles.findFirst({
      where: and(
        eq(schema.roles.name, "Student"),
        eq(schema.roles.tenantId, tenantId)
      )
    });
    const customRoleId = studentRole?.id || null;

    // 4. Perform imports transactionally (User, Student, AdmissionApplication, and AdmissionDocuments)
    await db.transaction(async (tx) => {
      for (const item of validRows) {
        const { rowData } = item;
        const passwordHash = await bcrypt.hash(rowData.password.trim(), 10);

        // A. Insert User Account
        const [user] = await tx
          .insert(schema.users)
          .values({
            tenantId,
            firstName: rowData.firstName.trim(),
            lastName: rowData.lastName.trim(),
            email: rowData.email.trim().toLowerCase(),
            passwordHash,
            role: "Student",
            customRoleId,
            status: "active",
          })
          .returning();

        // B. Insert Admission Application (Marked as approved to show under "Approved")
        const [app] = await tx
          .insert(schema.admissionApplications)
          .values({
            tenantId,
            batchId,
            email: rowData.email.trim().toLowerCase(),
            firstName: rowData.firstName.trim(),
            lastName: rowData.lastName.trim(),
            dateOfBirth: new Date("2000-01-01"), // default fallback
            academicHistory: {
              highestDegree: rowData.highestEducation.trim(),
              institution: rowData.collegeInstitution.trim(),
              gpaOrPercentage: rowData.gpaCgpa.trim(),
            },
            status: "approved",
          })
          .returning();

        // C. Insert documents
        const docNamesList = rowData.docNames.split(",").map(s => s.trim()).filter(Boolean);
        const docLinksList = rowData.docLinks.split(",").map(s => s.trim()).filter(Boolean);
        
        const docCount = Math.max(docNamesList.length, docLinksList.length);
        for (let d = 0; d < docCount; d++) {
          const docName = docNamesList[d] || `Document ${d + 1}`;
          const fileUrl = docLinksList[d] || "https://example.com/dummy.pdf";
          
          await tx
            .insert(schema.admissionDocuments)
            .values({
              tenantId,
              applicationId: app.id,
              documentName: docName,
              fileUrl,
              status: "verified",
            });
        }

        // D. Insert Student profile
        await tx
          .insert(schema.students)
          .values({
            tenantId,
            userId: user.id,
            batchId,
            rollNumber: rowData.rollNumber.trim(),
            admissionNumber: rowData.admissionNumber.trim(),
          });
      }
    });

    return {
      success: true,
      importedCount: validRows.length,
      errors: [],
    };

  } catch (err) {
    console.error("Bulk onboarding error:", err);
    const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during database import";
    return {
      success: false,
      importedCount: 0,
      errors: [{ row: 0, field: "database", message: errMsg }]
    };
  }
}
