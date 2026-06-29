import { z } from "zod";

export const academicHistorySchema = z.object({
  highestDegree: z.string().min(2, "Degree description is required"),
  institution: z.string().min(2, "Institution name is required"),
  gpaOrPercentage: z.string().min(1, "GPA or Percentage is required"),
  graduationYear: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 5),
  experienceMonths: z.coerce.number().int().nonnegative().default(0),
});

export const admissionApplicationSchema = z.object({
  batchId: z.string().uuid("Please select a valid batch"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().min(5, "Phone number is required"),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date of birth",
  }),
  academicHistory: academicHistorySchema,
});

export const documentUploadSchema = z.object({
  documentName: z.string().min(1, "Document name is required"),
  fileUrl: z.string().url("Invalid file URL"),
});

export const paymentSubmitSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  paymentMethod: z.enum(["stripe", "razorpay", "bank_transfer", "card"]),
  transactionId: z.string().min(3, "Transaction ID is required"),
});

export const applicationReviewSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(["under_review", "payment_pending", "approved", "rejected"]),
  feedback: z.string().optional(),
});

export type AdmissionApplicationInput = z.infer<typeof admissionApplicationSchema>;
export type AcademicHistoryInput = z.infer<typeof academicHistorySchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type PaymentSubmitInput = z.infer<typeof paymentSubmitSchema>;
export type ApplicationReviewInput = z.infer<typeof applicationReviewSchema>;
