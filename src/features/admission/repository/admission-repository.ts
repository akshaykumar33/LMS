import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { AdmissionApplicationInput } from "../schemas/admission-schemas";

export class AdmissionRepository {
  /**
   * Create a new admission application within a tenant context.
   */
  static async createApplication(
    tenantId: string,
    input: AdmissionApplicationInput & { status?: string }
  ) {
    const [application] = await db
      .insert(schema.admissionApplications)
      .values({
        tenantId,
        batchId: input.batchId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        dateOfBirth: new Date(input.dateOfBirth),
        academicHistory: input.academicHistory,
        status: input.status || "pending",
      })
      .returning();

    return application;
  }

  /**
   * Find an application by ID, ensuring it belongs to the tenant.
   */
  static async findById(tenantId: string, id: string) {
    const application = await db.query.admissionApplications.findFirst({
      where: and(
        eq(schema.admissionApplications.id, id),
        eq(schema.admissionApplications.tenantId, tenantId)
      ),
      with: {
        documents: true,
        payments: true,
        batch: true,
      },
    });

    return application;
  }

  /**
   * Find an application by email within a tenant, to check duplicate pending applications.
   */
  static async findByEmail(tenantId: string, email: string) {
    return db.query.admissionApplications.findFirst({
      where: and(
        eq(schema.admissionApplications.email, email),
        eq(schema.admissionApplications.tenantId, tenantId),
        sql`${schema.admissionApplications.deletedAt} IS NULL`
      ),
    });
  }

  /**
   * List all applications for a tenant with optional status and batch filters.
   */
  static async listApplications(
    tenantId: string | string[],
    filters: { status?: string; batchId?: string } = {}
  ) {
    const tenantCondition = Array.isArray(tenantId)
      ? inArray(schema.admissionApplications.tenantId, tenantId)
      : eq(schema.admissionApplications.tenantId, tenantId);

    const conditions = [
      tenantCondition,
      sql`${schema.admissionApplications.deletedAt} IS NULL`,
    ];

    if (filters.status) {
      conditions.push(eq(schema.admissionApplications.status, filters.status));
    }
    if (filters.batchId) {
      conditions.push(eq(schema.admissionApplications.batchId, filters.batchId));
    }

    return db.query.admissionApplications.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.admissionApplications.createdAt)],
      with: {
        batch: true,
        payments: true,
      },
    });
  }

  /**
   * Add a document upload record linked to an application.
   */
  static async addDocument(
    tenantId: string,
    applicationId: string,
    documentName: string,
    fileUrl: string
  ) {
    const [doc] = await db
      .insert(schema.admissionDocuments)
      .values({
        tenantId,
        applicationId,
        documentName,
        fileUrl,
        status: "pending",
      })
      .returning();

    return doc;
  }

  /**
   * Update the verification status of a document.
   */
  static async updateDocumentStatus(
    tenantId: string,
    documentId: string,
    status: "verified" | "rejected"
  ) {
    const [doc] = await db
      .update(schema.admissionDocuments)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(schema.admissionDocuments.id, documentId),
          eq(schema.admissionDocuments.tenantId, tenantId)
        )
      )
      .returning();

    return doc;
  }

  /**
   * Record a payment against an application.
   */
  static async recordPayment(
    tenantId: string,
    applicationId: string,
    amount: string,
    paymentMethod: string,
    transactionId: string,
    status: "pending" | "completed" | "failed" = "pending"
  ) {
    const [payment] = await db
      .insert(schema.admissionPayments)
      .values({
        tenantId,
        applicationId,
        amount,
        paymentMethod,
        transactionId,
        status,
      })
      .returning();

    return payment;
  }

  /**
   * Update application status.
   */
  static async updateApplicationStatus(
    tenantId: string,
    applicationId: string,
    status: string
  ) {
    const [app] = await db
      .update(schema.admissionApplications)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(schema.admissionApplications.id, applicationId),
          eq(schema.admissionApplications.tenantId, tenantId)
        )
      )
      .returning();

    return app;
  }

  /**
   * Core transactional procedure to approve an application, provision a User,
   * create a Student profile, and allocate them to their Batch.
   */
  static async approveAndEnrollStudent(
    tenantId: string,
    applicationId: string,
    passwordHash: string,
    studentRoleUuid: string,
    rollNumber: string,
    admissionNumber: string
  ) {
    return db.transaction(async (tx) => {
      // 1. Fetch application details in transaction
      const app = await tx.query.admissionApplications.findFirst({
        where: and(
          eq(schema.admissionApplications.id, applicationId),
          eq(schema.admissionApplications.tenantId, tenantId)
        ),
      });

      if (!app) {
        throw new Error("Application not found");
      }

      const existingUser = await tx.query.users.findFirst({
        where: and(
          eq(schema.users.email, app.email),
          eq(schema.users.tenantId, tenantId)
        ),
      });
      if (existingUser) {
        throw new Error("Student account has already been created/signed up.");
      }

      // 2. Update application status to approved
      await tx
        .update(schema.admissionApplications)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(schema.admissionApplications.id, applicationId));

      // 3. Create the User record
      const [user] = await tx
        .insert(schema.users)
        .values({
          tenantId,
          firstName: app.firstName,
          lastName: app.lastName,
          email: app.email,
          passwordHash,
          role: "Student",
          customRoleId: studentRoleUuid,
          status: "active",
        })
        .returning();

      // 4. Create the Student profile and associate with Batch
      const [student] = await tx
        .insert(schema.students)
        .values({
          tenantId,
          userId: user.id,
          batchId: app.batchId,
          rollNumber,
          admissionNumber,
        })
        .returning();

      return { user, student };
    });
  }
}
