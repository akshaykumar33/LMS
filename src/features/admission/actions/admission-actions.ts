"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { AdmissionService } from "../services/admission-service";
import { createStripePaymentIntent } from "../services/stripe-service";
import { createRazorpayOrder, verifyRazorpaySignature } from "../services/razorpay-service";
import { getRazorpayEnvKeys, getPaymentMode } from "../services/payment-config";
import { AdmissionRepository } from "../repository/admission-repository";
import { admissionApplicationSchema, paymentSubmitSchema, documentUploadSchema } from "../schemas/admission-schemas";
import { db } from "@/db/db";
import { batches, tenants } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { establishSessionAction } from "@/features/auth/actions/auth-actions";

/**
 * Public Action: Submit new applicant application.
 */
export async function submitAdmissionApplicationAction(formData: any) {
  const fs = require("fs");
  const path = require("path");
  const logFile = path.join(process.cwd(), "debug.log");

  try {
    fs.appendFileSync(logFile, `[ADMISSION ACTION] starting submission with: ${JSON.stringify(formData)}\n`);
    const tenant = await getTenantContext();
    if (!tenant) {
      fs.appendFileSync(logFile, `[ADMISSION ACTION] ERROR: No tenant context.\n`);
      throw new Error("No tenant resolved from context.");
    }
    fs.appendFileSync(logFile, `[ADMISSION ACTION] resolved tenant: ${tenant.id} (${tenant.subdomain})\n`);

    const parsed = admissionApplicationSchema.safeParse(formData);
    if (!parsed.success) {
      const errStr = parsed.error.issues.map((e: any) => e.message).join(", ");
      fs.appendFileSync(logFile, `[ADMISSION ACTION] Zod validation failed: ${errStr}\n`);
      return {
        success: false,
        error: errStr,
      };
    }

    fs.appendFileSync(logFile, `[ADMISSION ACTION] Zod validated, calling AdmissionService.submitApplication\n`);
    const app = await AdmissionService.submitApplication(tenant.id, parsed.data);
    fs.appendFileSync(logFile, `[ADMISSION ACTION] submitApplication success: ${app.id}\n`);

    try {
      const { sendTenantEmail } = require("@/features/notification/services/mail-service");
      sendTenantEmail(tenant.id, {
        to: parsed.data.email,
        subject: `Application Received - ${tenant.name}`,
        html: `<p>Hi ${parsed.data.firstName},</p>
               <p>Thank you for submitting your admission application to ${tenant.name}.</p>
               <p>We are reviewing your application and will get back to you shortly.</p>
               <p>Best regards,<br/>Admissions Team</p>`
      }).catch((err: any) => console.error("Failed to send submission email:", err));
    } catch (e) {
      console.error("Failed to trigger submission email dispatch:", e);
    }

    return { success: true, applicationId: app.id };
  } catch (error: any) {
    fs.appendFileSync(logFile, `[ADMISSION ACTION] CATCH ERROR: ${error.message || error}\nStack: ${error.stack}\n`);
    return { success: false, error: error.message || "Failed to submit application." };
  }
}

/**
 * Public Action: Submit document details for application.
 */
export async function submitDocumentAction(applicationId: string, documentName: string, fileUrl: string) {
  const fs = require("fs");
  const path = require("path");
  const logFile = path.join(process.cwd(), "debug.log");

  try {
    fs.appendFileSync(logFile, `[ADMISSION DOCUMENT] starting doc submit: ${applicationId}, ${documentName}, ${fileUrl}\n`);
    const tenant = await getTenantContext();
    if (!tenant) throw new Error("No tenant context.");

    const parsed = documentUploadSchema.safeParse({ documentName, fileUrl });
    if (!parsed.success) {
      fs.appendFileSync(logFile, `[ADMISSION DOCUMENT] invalid schema\n`);
      return { success: false, error: "Invalid document details." };
    }

    fs.appendFileSync(logFile, `[ADMISSION DOCUMENT] calling AdmissionService.uploadDocument\n`);
    const doc = await AdmissionService.uploadDocument(tenant.id, applicationId, documentName, fileUrl);
    fs.appendFileSync(logFile, `[ADMISSION DOCUMENT] uploadDocument success: ${doc.id}\n`);
    return { success: true, documentId: doc.id };
  } catch (error: any) {
    fs.appendFileSync(logFile, `[ADMISSION DOCUMENT] CATCH ERROR: ${error.message || error}\nStack: ${error.stack}\n`);
    return { success: false, error: error.message };
  }
}

/**
 * Public Action: Submit application payment details.
 */
export async function submitPaymentAction(applicationId: string, formData: any) {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("No tenant context.");

  const parsed = paymentSubmitSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e: any) => e.message).join(", ") };
  }

  try {
    const payment = await AdmissionService.submitPayment(
      tenant.id,
      applicationId,
      parsed.data.amount,
      parsed.data.paymentMethod,
      parsed.data.transactionId
    );
    return { success: true, paymentId: payment.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Public Query Action: Get active batches for current tenant (for admission form dropdown).
 */
export async function getBatchesAction() {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  try {
    return db.query.batches.findMany({
      where: eq(batches.tenantId, tenant.id),
    });
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return [];
  }
}

/**
 * Protected Admin Action: List all admission applications for dashboard.
 */
export async function listApplicationsAction(filters?: { status?: string; batchId?: string }) {
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  
  try {
    return AdmissionRepository.listApplications(user.tenantId, filters);
  } catch (error: any) {
    throw new Error(error.message || "Failed to load applications.");
  }
}

/**
 * Protected Admin Action: Approve application status (setting status to approved).
 */
export async function approveApplicationAction(applicationId: string) {
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  verifyWriteAccess(user);

  try {
    await AdmissionService.approveApplication(user.tenantId, applicationId);

    // Fetch applicant details to send email
    const app = await db.query.admissionApplications.findFirst({
      where: eq(schema.admissionApplications.id, applicationId),
    });

    if (app) {
      try {
        const { sendTenantEmail } = require("@/features/notification/services/mail-service");
        sendTenantEmail(user.tenantId, {
          to: app.email,
          subject: `Application Approved - ${user.tenantId}`,
          html: `<p>Hi ${app.firstName},</p>
                 <p>Congratulations! Your admission application has been approved.</p>
                 <p>An administrator will provision your student account and share your credentials shortly.</p>
                 <p>Best regards,<br/>Admissions Team</p>`
        }).catch((err: any) => console.error("Failed to send approval email:", err));
      } catch (e) {
        console.error("Failed to trigger approval email dispatch:", e);
      }
    }

    revalidatePath("/admin/admissions");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to approve application." };
  }
}

/**
 * Protected Admin Action: Manually provision account and sign up student.
 */
export async function manualSignUpStudentAction(applicationId: string, passwordText: string) {
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  verifyWriteAccess(user);

  try {
    const result = await AdmissionService.provisionStudentAccount(user.tenantId, applicationId, passwordText);

    try {
      const { NotificationRepository } = require("@/features/notification/repository/notification-repository");
      await NotificationRepository.createNotification(
        user.tenantId,
        result.user.id,
        "Welcome to the Center of Excellence!",
        "Your student account has been manually provisioned. Welcome aboard!",
        "success"
      );
    } catch (e) {
      console.error("Failed to trigger signup notification:", e);
    }

    try {
      const { sendTenantEmail } = require("@/features/notification/services/mail-service");
      sendTenantEmail(user.tenantId, {
        to: result.user.email,
        subject: `Account Created - Welcome to ${user.tenantId}`,
        html: `<p>Hi ${result.user.firstName},</p>
               <p>Your student account has been created successfully.</p>
               <p><strong>Roll Number:</strong> ${result.student.rollNumber}</p>
               <p><strong>Admission ID:</strong> ${result.student.admissionNumber}</p>
               <p><strong>Password:</strong> ${passwordText || "Password123"}</p>
               <p>You can now log in using these credentials.</p>
               <p>Best regards,<br/>Admissions Team</p>`
      }).catch((err: any) => console.error("Failed to send signup email:", err));
    } catch (e) {
      console.error("Failed to trigger signup email dispatch:", e);
    }

    revalidatePath("/admin/admissions");
    revalidatePath("/dashboard");
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to sign up student." };
  }
}

/**
 * Protected Admin Action: Reject application.
 */
export async function rejectApplicationAction(applicationId: string) {
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  verifyWriteAccess(user);

  try {
    await AdmissionService.rejectApplication(user.tenantId, applicationId);
    revalidatePath("/admin/admissions");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Protected Admin Action: Get specific application details.
 */
export async function getApplicationDetailsAction(applicationId: string) {
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  
  try {
    const details = await AdmissionRepository.findById(user.tenantId, applicationId);
    if (!details) {
      return { success: false, error: "Application not found." };
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(schema.users.email, details.email),
        eq(schema.users.tenantId, user.tenantId)
      ),
    });

    return { 
      success: true, 
      data: {
        ...details,
        isEnrolled: !!existingUser
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Public Action: Register a new student application/account during self-signup.
 */
export async function registerStudentAction(formData: any) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context resolved." };
  }

  const { firstName, lastName, email, password, batchId, phone, dateOfBirth } = formData;
  if (!firstName || !lastName || !email || !password || !batchId || !dateOfBirth) {
    return { success: false, error: "All required fields must be provided." };
  }

  try {
    // 1. Check if application for this email already exists
    const existing = await AdmissionRepository.findByEmail(tenant.id, email);
    if (existing) {
      return { success: false, error: "An application or user with this email already exists." };
    }

    // 2. Hash the desired password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create the admission application with status "payment_pending"
    // and store the desiredPasswordHash inside academicHistory
    const app = await AdmissionRepository.createApplication(tenant.id, {
      batchId,
      email,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      academicHistory: {
        highestDegree: "Self-Registered",
        institution: "Self-Registered",
        gpaOrPercentage: "N/A",
        graduationYear: new Date().getFullYear(),
        experienceMonths: 0,
        // Custom key to retrieve chosen password on payment completion
        desiredPasswordHash: hashedPassword,
      } as any,
      status: "payment_pending",
    });

    return { success: true, applicationId: app.id };
  } catch (error: any) {
    console.error("Student registration failed:", error);
    return { success: false, error: error.message || "Failed to register student." };
  }
}

import * as schema from "@/db/schema";

/**
 * Public Action: Generate Stripe Payment Intent for student application fee.
 */
export async function createStripePaymentIntentAction(applicationId: string) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context resolved." };
  }

  try {
    const app = await AdmissionRepository.findById(tenant.id, applicationId);
    if (!app) {
      return { success: false, error: "Application not found." };
    }

    if (app.status === "approved") {
      return { success: false, error: "This application is already approved." };
    }

    // Get tuition fee from tenant settings, default to 1500.00
    const feeStr = (tenant.settings as any)?.tuitionFee || "1500.00";
    const feeNum = parseFloat(feeStr);
    const amountInCents = Math.round(feeNum * 100);

    const metadata = {
      tenantId: tenant.id,
      applicationId: app.id,
      email: app.email,
    };

    const intent = await createStripePaymentIntent(tenant.id, amountInCents, metadata);
    return {
      success: true,
      clientSecret: intent.clientSecret,
      publishableKey: intent.publishableKey,
      isSandbox: intent.isSandbox,
    };
  } catch (error: any) {
    console.error("Failed to create Stripe payment intent:", error);
    return { success: false, error: error.message || "Failed to initialize payment." };
  }
}

/**
 * Public Action: Process checkout payment completion, record payment, and mark application as paid.
 */
export async function completePaymentAndEnrollAction(
  appId: string,
  paymentMethod: string,
  transactionId: string
) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context resolved." };
  }

  try {
    // 1. Fetch application details
    const app = await AdmissionRepository.findById(tenant.id, appId);
    if (!app) {
      return { success: false, error: "Application not found." };
    }

    if (app.status === "approved") {
      return { success: false, error: "This application is already approved." };
    }

    // Get tuition fee from tenant settings, default to 1500.00
    const feeStr = (tenant.settings as any)?.tuitionFee || "1500.00";

    // 2. Record the payment as completed
    await AdmissionRepository.recordPayment(
      tenant.id,
      appId,
      feeStr,
      paymentMethod,
      transactionId,
      "completed"
    );

    // 3. Update application status to "paid"
    await AdmissionRepository.updateApplicationStatus(tenant.id, appId, "paid");

    try {
      const { sendTenantEmail } = require("@/features/notification/services/mail-service");
      sendTenantEmail(tenant.id, {
        to: app.email,
        subject: `Payment Confirmed - ${tenant.name}`,
        html: `<p>Hi ${app.firstName},</p>
               <p>We have successfully verified your tuition sandbox payment of $${feeStr} via ${paymentMethod} (Transaction ID: ${transactionId}).</p>
               <p>Your enrollment is now complete.</p>
               <p>Best regards,<br/>Admissions Team</p>`
      }).catch((err: any) => console.error("Failed to send payment email:", err));
    } catch (e) {
      console.error("Failed to trigger payment success email dispatch:", e);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Payment completion failed:", error);
    return { success: false, error: error.message || "Failed to complete checkout." };
  }
}

/**
 * Public Action: Get public application details for pre-filling signup fields safely.
 */
export async function getPublicApplicationDetailsAction(applicationId: string) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context resolved." };
  }

  try {
    const details = await AdmissionRepository.findById(tenant.id, applicationId);
    if (!details) {
      return { success: false, error: "Application not found." };
    }

    return {
      success: true,
      data: {
        id: details.id,
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        phone: details.phone,
        dateOfBirth: details.dateOfBirth 
          ? (typeof details.dateOfBirth === "string" 
              ? new Date(details.dateOfBirth) 
              : details.dateOfBirth
            ).toISOString().split("T")[0] 
          : "",
        batchId: details.batchId,
        status: details.status,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Public Action: Complete signup by hashing chosen password, saving it, and creating student account.
 */
export async function completeSignupAndEnrollAction(appId: string, password: any) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context resolved." };
  }

  try {
    const app = await AdmissionRepository.findById(tenant.id, appId);
    if (!app) {
      return { success: false, error: "Application not found." };
    }

    if (app.status === "approved") {
      return { success: false, error: "This application has already been approved and enrolled." };
    }

    // 1. Hash the password and update desiredPasswordHash inside academicHistory
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedHistory = {
      ...(app.academicHistory as any || {}),
      desiredPasswordHash: hashedPassword,
    };

    await db.update(schema.admissionApplications)
      .set({
        academicHistory: updatedHistory,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(schema.admissionApplications.id, appId),
          eq(schema.admissionApplications.tenantId, tenant.id)
        )
      );

    // 2. Approve and enroll the student
    const enrollment = await AdmissionService.provisionStudentAccount(tenant.id, appId, password);

    if (!enrollment || !enrollment.user) {
      return { success: false, error: "Failed to enroll student account." };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Signup and enrollment completion failed:", error);
    return { success: false, error: error.message || "Failed to complete signup." };
  }
}

/**
 * Public Action: Generate S3 presigned upload URL for document upload.
 */
export async function getPresignedUrlAction(fileName: string, contentType: string) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context resolved." };
  }

  try {
    const { generatePresignedUploadUrl } = require("../services/s3-service");
    const result = await generatePresignedUploadUrl(tenant.id, fileName, contentType);

    if (!result) {
      return { success: false, error: "Failed to generate presigned URL." };
    }

    return { success: true, ...result };
  } catch (error: any) {
    console.error("Failed to generate presigned upload URL action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Protected Tenant Owner/Admin Action: Update payment settings for their own tenant.
 */
export async function updateTenantPaymentSettingsAction(settings: {
  tuitionFee: string;
  paymentRequired: boolean;
  gateways: {
    stripe: boolean;
    razorpay: boolean;
    paypal: boolean;
  };
}) {
  const user = await requireAuth(["Owner", "Admin"]);
  verifyWriteAccess(user);

  try {
    const tenantId = user.tenantId;
    if (!tenantId) {
      return { success: false, error: "No tenant context associated with this user." };
    }

    // 1. Fetch current tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    // 2. Merge settings
    const currentSettings = tenant.settings || {
      features: { enableLibrary: true, enablePlacement: true, enableProctoring: true, enableCertificates: true },
      gateways: { stripe: true, razorpay: true, paypal: true },
      restrictions: { maxUsers: 500, maxCourses: 100, allowSelfSignup: true }
    };

    const newSettings = {
      ...currentSettings,
      paymentRequired: settings.paymentRequired,
      tuitionFee: settings.tuitionFee,
      gateways: {
        ...currentSettings.gateways,
        ...settings.gateways,
      }
    };

    // 3. Update in database
    await db.update(tenants)
      .set({
        settings: newSettings as any,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    revalidatePath("/admin/admissions");
    revalidatePath("/checkout");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update tenant payment settings:", error);
    return { success: false, error: error.message || "Failed to save settings." };
  }
}


/**
 * Public Action: Create a Razorpay order for a student application fee.
 * Returns the orderId + keyId needed to open the Razorpay checkout widget.
 */
export async function createRazorpayOrderAction(applicationId: string) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context resolved." };
  }

  try {
    const app = await AdmissionRepository.findById(tenant.id, applicationId);
    if (!app) {
      return { success: false, error: "Application not found." };
    }
    if (app.status === "approved") {
      return { success: false, error: "This application is already approved." };
    }

    // Dynamic fee support: read tenant context settings or fallback
    const tuitionFeeStr = (tenant.settings as any)?.tuitionFee || "1500.00";
    const amountInDollars = parseFloat(tuitionFeeStr);
    
    // ₹1,25,000 → 125000 paise (or equivalent converted: $1 USD = ~83 INR, but we keep the master's INR standard)
    const amountInPaise = amountInDollars * 83 * 100;

    const order = await createRazorpayOrder(
      tenant.id,
      amountInPaise,
      `app_${applicationId.substring(0, 12)}`,
      {
        tenantId: tenant.id,
        applicationId: app.id,
        email: app.email,
      }
    );

    return {
      success: true,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      isSandbox: order.isSandbox,
    };
  } catch (error: any) {
    console.error("Failed to create Razorpay order:", error);
    return { success: false, error: error.message || "Failed to initialize Razorpay payment." };
  }
}

/**
 * Public Action: Verify Razorpay payment signature and complete enrollment.
 * Called client-side after Razorpay checkout widget closes with success.
 */
export async function verifyAndCompleteRazorpayPaymentAction(
  applicationId: string,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "No tenant context resolved." };
  }

  try {
    const { isSandbox } = getPaymentMode("razorpay");
    const { keySecret } = getRazorpayEnvKeys();

    // In sandbox with mock key we skip real verification (mirror Stripe mock fallback)
    const isMockKey = keySecret.includes("Mock") || keySecret.includes("mock");

    let signatureValid: boolean;
    if (isSandbox && isMockKey) {
      console.warn("[Razorpay Sandbox] Skipping signature verification — mock key in use.");
      signatureValid = true;
    } else {
      signatureValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        keySecret
      );
    }

    if (!signatureValid) {
      return { success: false, error: "Payment verification failed. Invalid signature." };
    }

    const tuitionFeeStr = (tenant.settings as any)?.tuitionFee || "1500.00";

    await AdmissionRepository.recordPayment(
      tenant.id,
      applicationId,
      tuitionFeeStr,
      "razorpay",
      razorpay_payment_id,
      "completed"
    );

    await AdmissionRepository.updateApplicationStatus(tenant.id, applicationId, "paid");

    const app = await AdmissionRepository.findById(tenant.id, applicationId);
    if (app) {
      try {
        const { sendTenantEmail } = require("@/features/notification/services/mail-service");
        sendTenantEmail(tenant.id, {
          to: app.email,
          subject: `Payment Confirmed — ${tenant.name}`,
          html: `<p>Hi ${app.firstName},</p>
                 <p>We have successfully verified your tuition payment of $${parseFloat(tuitionFeeStr).toFixed(2)} via Razorpay (Payment ID: ${razorpay_payment_id}).</p>
                 <p>Your enrollment is now complete.</p>
                 <p>Best regards,<br/>Admissions Team</p>`
        }).catch((err: any) => console.error("Failed to send Razorpay payment email:", err));
      } catch (e) {
        console.error("Failed to trigger Razorpay payment success email:", e);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Razorpay payment verification failed:", error);
    return { success: false, error: error.message || "Failed to complete Razorpay checkout." };
  }
}

/**
 * Protected Admin Action: Verify or reject admission documents.
 */
export async function updateDocumentStatusAction(
  documentId: string,
  status: "verified" | "rejected",
  reason?: string
) {
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  verifyWriteAccess(user);

  try {
    const [doc] = await db
      .update(schema.admissionDocuments)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(schema.admissionDocuments.id, documentId),
          eq(schema.admissionDocuments.tenantId, user.tenantId)
        )
      )
      .returning();

    if (!doc) {
      return { success: false, error: "Document not found." };
    }

    // Fetch applicant details
    const app = await db.query.admissionApplications.findFirst({
      where: eq(schema.admissionApplications.id, doc.applicationId),
    });

    if (app && status === "rejected") {
      try {
        const { sendTenantEmail } = require("@/features/notification/services/mail-service");
        await sendTenantEmail(user.tenantId, {
          to: app.email,
          subject: `Admission Document Rejected - ${doc.documentName}`,
          html: `<p>Hi ${app.firstName},</p>
                 <p>Your uploaded document <strong>${doc.documentName}</strong> has been rejected during review.</p>
                 ${reason ? `<p><strong>Reason for rejection:</strong> ${reason}</p>` : ""}
                 <p>Please log in to your application portal and upload a valid document to continue your onboarding process.</p>
                 <p>Best regards,<br/>Admissions Team</p>`
        });
      } catch (mailErr) {
        console.error("Failed to send document rejection email:", mailErr);
      }
    }

    revalidatePath("/admin/admissions");
    return { success: true, data: doc };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update document status." };
  }
}

/**
 * Protected Admin Action: Direct Admission for a user, provisioning the account,
 * uploading verified documents, and linking selected courses to the cohort batch.
 */
export async function adminDirectAdmissionAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
  batchId: string;
  selectedCourseIds: string[];
  academicHistory: {
    highestDegree: string;
    institution: string;
    gpaOrPercentage: string;
    graduationYear: number;
    experienceMonths: number;
  };
  documents: { documentName: string; fileUrl: string }[];
}) {
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  verifyWriteAccess(user);

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      password,
      batchId,
      selectedCourseIds,
      academicHistory,
      documents,
    } = data;

    // 1. Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(schema.users.email, email),
        eq(schema.users.tenantId, user.tenantId)
      ),
    });
    if (existingUser) {
      return { success: false, error: "A user with this email address already exists." };
    }

    const existingApp = await db.query.admissionApplications.findFirst({
      where: and(
        eq(schema.admissionApplications.email, email),
        eq(schema.admissionApplications.tenantId, user.tenantId)
      ),
    });
    if (existingApp) {
      return { success: false, error: "An admission application with this email address already exists." };
    }

    // 2. Fetch the Student Role UUID for the tenant
    const studentRole = await db.query.roles.findFirst({
      where: and(
        eq(schema.roles.tenantId, user.tenantId),
        eq(schema.roles.name, "Student")
      ),
    });

    if (!studentRole) {
      return { success: false, error: "Student system role was not found for this tenant." };
    }

    // 3. Generate unique Roll Number and Admission Number
    const year = new Date().getFullYear().toString().substring(2);
    const tenantStudentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.students)
      .where(eq(schema.students.tenantId, user.tenantId));

    const count = Number(tenantStudentCountResult[0]?.count || 0) + 1;
    const seq = count.toString().padStart(4, "0");

    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, user.tenantId),
    });
    const subCode = (tenant?.subdomain || "COE").toUpperCase();

    const rollNumber = `ME-${subCode}-${year}-${seq}`;
    const admissionNumber = `ADM-${subCode}-${seq}`;

    // 4. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Execute transaction
    await db.transaction(async (tx) => {
      // Create admission application with status "approved"
      const [app] = await tx
        .insert(schema.admissionApplications)
        .values({
          tenantId: user.tenantId,
          batchId,
          email,
          firstName,
          lastName,
          phone,
          dateOfBirth: new Date(dateOfBirth),
          academicHistory: {
            ...academicHistory,
            desiredPasswordHash: hashedPassword,
          },
          status: "approved",
        })
        .returning();

      // Create the User record
      const [dbUser] = await tx
        .insert(schema.users)
        .values({
          tenantId: user.tenantId,
          firstName,
          lastName,
          email,
          passwordHash: hashedPassword,
          role: "Student",
          customRoleId: studentRole.id,
          status: "active",
        })
        .returning();

      // Create the Student profile and associate with Batch
      await tx
        .insert(schema.students)
        .values({
          tenantId: user.tenantId,
          userId: dbUser.id,
          batchId,
          rollNumber,
          admissionNumber,
        });

      // Create verified documents
      if (documents && documents.length > 0) {
        for (const doc of documents) {
          await tx
            .insert(schema.admissionDocuments)
            .values({
              tenantId: user.tenantId,
              applicationId: app.id,
              documentName: doc.documentName,
              fileUrl: doc.fileUrl,
              status: "verified",
            });
        }
      }

      // Link selected courses to the batch if not already linked
      if (selectedCourseIds && selectedCourseIds.length > 0) {
        for (const courseId of selectedCourseIds) {
          const existingLink = await tx.query.courseBatches.findFirst({
            where: and(
              eq(schema.courseBatches.courseId, courseId),
              eq(schema.courseBatches.batchId, batchId)
            ),
          });
          if (!existingLink) {
            await tx
              .insert(schema.courseBatches)
              .values({
                courseId,
                batchId,
              });
          }
        }
      }
    });

    revalidatePath("/admin/admissions");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Direct Admission action failed:", error);
    return { success: false, error: error.message || "Failed to complete direct admission." };
  }
}

