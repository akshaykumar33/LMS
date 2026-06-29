import bcrypt from "bcryptjs";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { AdmissionRepository } from "../repository/admission-repository";
import { AdmissionApplicationInput } from "../schemas/admission-schemas";

export class AdmissionService {
  /**
   * Submit a new applicant registration.
   */
  static async submitApplication(tenantId: string, input: AdmissionApplicationInput) {
    // 1. Check if application for this email already exists
    const existing = await AdmissionRepository.findByEmail(tenantId, input.email);
    if (existing) {
      throw new Error("An active application with this email already exists.");
    }

    // 2. Validate batch exists and belongs to the tenant
    const batch = await db.query.batches.findFirst({
      where: and(
        eq(schema.batches.id, input.batchId),
        eq(schema.batches.tenantId, tenantId)
      ),
    });

    if (!batch) {
      throw new Error("The selected batch does not exist.");
    }

    // 3. Create database record
    return AdmissionRepository.createApplication(tenantId, {
      ...input,
      status: "pending",
    });
  }

  /**
   * Submit documents for a pending application.
   */
  static async uploadDocument(
    tenantId: string,
    applicationId: string,
    documentName: string,
    fileUrl: string
  ) {
    const app = await AdmissionRepository.findById(tenantId, applicationId);
    if (!app) {
      throw new Error("Application not found.");
    }

    const doc = await AdmissionRepository.addDocument(tenantId, applicationId, documentName, fileUrl);

    // If application was in "pending" status, move to "under_review" upon document upload
    if (app.status === "pending") {
      await AdmissionRepository.updateApplicationStatus(tenantId, applicationId, "under_review");
    }

    return doc;
  }

  /**
   * Process and register application fee payments.
   */
  static async submitPayment(
    tenantId: string,
    applicationId: string,
    amount: string,
    paymentMethod: string,
    transactionId: string
  ) {
    const app = await AdmissionRepository.findById(tenantId, applicationId);
    if (!app) {
      throw new Error("Application not found.");
    }

    // Record the payment
    const payment = await AdmissionRepository.recordPayment(
      tenantId,
      applicationId,
      amount,
      paymentMethod,
      transactionId,
      "completed" // Hardcoded successful payment for demo purposes
    );

    // If application was waiting for payment, move it to "under_review" or "payment_received"
    if (app.status === "payment_pending") {
      await AdmissionRepository.updateApplicationStatus(tenantId, applicationId, "under_review");
    }

    return payment;
  }

  /**
   * Approve application, provision account and student profile.
   */
  static async approveApplication(tenantId: string, applicationId: string) {
    const app = await AdmissionRepository.findById(tenantId, applicationId);
    if (!app) {
      throw new Error("Application not found.");
    }

    if (app.status === "approved") {
      throw new Error("Application is already approved.");
    }

    // 1. Check Batch capacity
    const batch = await db.query.batches.findFirst({
      where: eq(schema.batches.id, app.batchId),
      with: {
        students: true,
      },
    });

    if (!batch) {
      throw new Error("Selected batch was not found.");
    }

    if (batch.students.length >= batch.capacity) {
      throw new Error(`The batch '${batch.name}' has reached its maximum capacity of ${batch.capacity} students.`);
    }

    // 2. Fetch the Student Role UUID for the tenant
    const studentRole = await db.query.roles.findFirst({
      where: and(
        eq(schema.roles.tenantId, tenantId),
        eq(schema.roles.name, "Student")
      ),
    });

    if (!studentRole) {
      throw new Error("Student system role was not found for this tenant.");
    }

    // 3. Generate unique Roll Number and Admission Number
    // Pattern: ME-<SUBDOMAIN>-<YEAR>-<SEQUENCE>
    const year = new Date().getFullYear().toString().substring(2);
    
    // Count existing students under this tenant to generate the sequence number
    const tenantStudentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.students)
      .where(eq(schema.students.tenantId, tenantId));
    
    const count = Number(tenantStudentCountResult[0]?.count || 0) + 1;
    const seq = count.toString().padStart(4, "0");

    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });
    const subCode = (tenant?.subdomain || "COE").toUpperCase();
    
    const rollNumber = `ME-${subCode}-${year}-${seq}`;
    const admissionNumber = `ADM-${subCode}-${seq}`;

    // 4. Determine password hash (use chosen password from signup if present, else default)
    let passwordHash = "";
    const desiredPasswordHash = (app.academicHistory as any)?.desiredPasswordHash;
    if (desiredPasswordHash) {
      passwordHash = desiredPasswordHash;
    } else {
      passwordHash = await bcrypt.hash("Password123", 10);
    }

    // 5. Run transactional enrollment
    const enrollment = await AdmissionRepository.approveAndEnrollStudent(
      tenantId,
      applicationId,
      passwordHash,
      studentRole.id,
      rollNumber,
      admissionNumber
    );

    // In a production application, we would fire an event/queue message here
    // to trigger an email notification to the student with their credentials.
    console.log(`Student enrolled successfully. Email: ${app.email}, Roll: ${rollNumber}`);

    return {
      ...enrollment,
      temporaryPassword: desiredPasswordHash ? "[Configured during Signup]" : "Password123",
    };
  }

  /**
   * Reject application.
   */
  static async rejectApplication(tenantId: string, applicationId: string) {
    return AdmissionRepository.updateApplicationStatus(tenantId, applicationId, "rejected");
  }
}
