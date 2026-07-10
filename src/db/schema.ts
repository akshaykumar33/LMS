import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, numeric, primaryKey, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. TENANTS TABLE
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 255 }).notNull().unique(),
  customDomain: varchar("custom_domain", { length: 255 }).unique(),
  dbName: varchar("db_name", { length: 255 }),
  branding: jsonb("branding").$type<{
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
  }>(),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, suspended, pending
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  parentTenantId: uuid("parent_tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  settings: jsonb("settings").$type<{
    features: {
      enableLibrary: boolean;
      enablePlacement: boolean;
      enableProctoring: boolean;
      enableCertificates: boolean;
    };
    gateways: {
      stripe: boolean;
      razorpay: boolean;
      paypal: boolean;
    };
    restrictions: {
      maxUsers: number;
      maxCourses: number;
      allowSelfSignup: boolean;
    };
    database?: {
      dbUrl?: string;
    };
  }>(),
}, (table) => {
  return {
    subdomainIdx: index("tenants_subdomain_idx").on(table.subdomain),
  };
});

// 2. ROLES TABLE (Tenant Scope or Global System default)
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id), // Nullable for global platform roles
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false), // e.g. Owner, Student, Faculty, Admin
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. PERMISSIONS TABLE (Global static set)
export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g. "admission:approve", "courses:write"
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. ROLE PERMISSIONS COMPOSITE TABLE
export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));

// 5. USERS TABLE
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // System role fallback (Owner, Admin, Student, etc.)
  customRoleId: uuid("custom_role_id").references(() => roles.id), // Dynamic RBAC link
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, pending_verification, suspended
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
}, (table) => {
  return {
    tenantEmailUnique: unique("users_tenant_email_unq").on(table.tenantId, table.email),
    tenantEmailIdx: index("users_tenant_email_idx").on(table.tenantId, table.email),
  };
});

// 6. BATCHES TABLE
export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(50),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => {
  return {
    tenantBatchIdx: index("batches_tenant_idx").on(table.tenantId),
  };
});

// 7. ADMISSION APPLICATIONS TABLE
export const admissionApplications = pgTable("admission_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").notNull().references(() => batches.id),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }).notNull(),
  academicHistory: jsonb("academic_history").$type<{
    highestDegree?: string;
    institution?: string;
    gpaOrPercentage?: string;
    graduationYear?: number;
    experienceMonths?: number;
  }>(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, under_review, payment_pending, approved, rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
}, (table) => {
  return {
    tenantAppIdx: index("admission_applications_tenant_idx").on(table.tenantId),
    statusIdx: index("admission_applications_status_idx").on(table.status),
  };
});

// 8. ADMISSION DOCUMENTS TABLE
export const admissionDocuments = pgTable("admission_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").notNull().references(() => admissionApplications.id, { onDelete: "cascade" }),
  documentName: varchar("document_name", { length: 255 }).notNull(), // e.g., Marksheet, ID Proof
  fileUrl: text("file_url").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, verified, rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 9. ADMISSION PAYMENTS TABLE
export const admissionPayments = pgTable("admission_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").notNull().references(() => admissionApplications.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, completed, failed
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // stripe, razorpay, bank_transfer, card
  transactionId: varchar("transaction_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    txnIdx: index("admission_payments_txn_idx").on(table.transactionId),
  };
});

// 10. STUDENTS TABLE
export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").notNull().references(() => batches.id),
  rollNumber: varchar("roll_number", { length: 100 }).notNull(),
  admissionNumber: varchar("admission_number", { length: 100 }).notNull(),
  resumeUrl: text("resume_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    tenantRollUnq: unique("students_tenant_roll_unq").on(table.tenantId, table.rollNumber),
    tenantAdmUnq: unique("students_tenant_adm_unq").on(table.tenantId, table.admissionNumber),
    tenantStudentIdx: index("students_tenant_idx").on(table.tenantId),
  };
});

// ==========================================
// COURSE MANAGEMENT ENTITIES
// ==========================================

// 11. COURSES TABLE
export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  syllabus: text("syllabus"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => {
  return {
    tenantCodeUnq: unique("courses_tenant_code_unq").on(table.tenantId, table.code),
    tenantCourseIdx: index("courses_tenant_idx").on(table.tenantId),
  };
});

// 12. COURSE BATCHES LINK TABLE
export const courseBatches = pgTable("course_batches", {
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.courseId, table.batchId] }),
}));

// 13. MODULES TABLE (Chapters inside Course)
export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 14. LESSONS TABLE (Units inside Module)
export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  contentType: varchar("content_type", { length: 50 }).notNull().default("text"), // video, pdf, text, live_class
  videoUrl: text("video_url"),
  fileUrl: text("file_url"),
  zoomMeetingId: varchar("zoom_meeting_id", { length: 100 }),
  zoomPasscode: varchar("zoom_passcode", { length: 100 }),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// QUIZ ENGINE ENTITIES
// ==========================================

// 15. QUIZZES TABLE
export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "cascade" }), // Nullable if linked to course directly
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  passingScore: integer("passing_score").notNull().default(70), // passing percentage (e.g. 70%)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 16. QUIZ QUESTIONS TABLE
export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 50 }).notNull().default("mcq"),
  options: jsonb("options").$type<{ id: string; text: string }[]>().notNull(),
  correctOptionId: varchar("correct_option_id", { length: 100 }).notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 17. QUIZ ATTEMPTS TABLE
export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // percentage scored
  passed: boolean("passed").notNull(),
  answers: jsonb("answers").$type<{ questionId: string; selectedOptionId: string }[]>().notNull(),
  infractionCount: integer("infraction_count").notNull().default(0),
  proctorVideoLogUrl: text("proctor_video_log_url"),
  isFlaggedForAudit: boolean("is_flagged_for_audit").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// RELATIONSHIPS DEFINITIONS
// ==========================================

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  parent: one(tenants, { fields: [tenants.parentTenantId], references: [tenants.id], relationName: "sub_tenants" }),
  children: many(tenants, { relationName: "sub_tenants" }),
  users: many(users),
  roles: many(roles),
  batches: many(batches),
  applications: many(admissionApplications),
  courses: many(courses),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  rolePermissions: many(rolePermissions),
  users: many(users),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  customRole: one(roles, { fields: [users.customRoleId], references: [roles.id] }),
  studentProfile: one(students, { fields: [users.id], references: [students.userId] }),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [batches.tenantId], references: [tenants.id] }),
  applications: many(admissionApplications),
  students: many(students),
  courseBatches: many(courseBatches),
}));

export const admissionApplicationsRelations = relations(admissionApplications, ({ one, many }) => ({
  tenant: one(tenants, { fields: [admissionApplications.tenantId], references: [tenants.id] }),
  batch: one(batches, { fields: [admissionApplications.batchId], references: [batches.id] }),
  documents: many(admissionDocuments),
  payments: many(admissionPayments),
}));

export const admissionDocumentsRelations = relations(admissionDocuments, ({ one }) => ({
  application: one(admissionApplications, { fields: [admissionDocuments.applicationId], references: [admissionApplications.id] }),
}));

export const admissionPaymentsRelations = relations(admissionPayments, ({ one }) => ({
  application: one(admissionApplications, { fields: [admissionPayments.applicationId], references: [admissionApplications.id] }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  tenant: one(tenants, { fields: [students.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [students.userId], references: [users.id] }),
  batch: one(batches, { fields: [students.batchId], references: [batches.id] }),
  quizAttempts: many(quizAttempts),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  tenant: one(tenants, { fields: [courses.tenantId], references: [tenants.id] }),
  courseBatches: many(courseBatches),
  modules: many(modules),
  quizzes: many(quizzes),
}));

export const courseBatchesRelations = relations(courseBatches, ({ one }) => ({
  course: one(courses, { fields: [courseBatches.courseId], references: [courses.id] }),
  batch: one(batches, { fields: [courseBatches.batchId], references: [batches.id] }),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, { fields: [modules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
  quizzes: many(quizzes),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  course: one(courses, { fields: [quizzes.courseId], references: [courses.id] }),
  lesson: one(lessons, { fields: [quizzes.lessonId], references: [lessons.id] }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
  student: one(students, { fields: [quizAttempts.studentId], references: [students.id] }),
}));

// 18. NOTIFICATIONS TABLE
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info, success, warning, alert
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, { fields: [notifications.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// 19. JOB POSTINGS TABLE
export const jobPostings = pgTable("job_postings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  salary: varchar("salary", { length: 100 }),
  location: varchar("location", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  type: varchar("type", { length: 50 }).notNull().default("job"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  tenant: one(tenants, { fields: [jobPostings.tenantId], references: [tenants.id] }),
  applications: many(jobApplications),
}));

// 20. JOB APPLICATIONS TABLE
export const jobApplications = pgTable("job_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").notNull().references(() => jobPostings.id, { onDelete: "cascade" }),
  resumeUrl: text("resume_url").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("applied"), // applied, interviewing, offered, rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  tenant: one(tenants, { fields: [jobApplications.tenantId], references: [tenants.id] }),
  student: one(students, { fields: [jobApplications.studentId], references: [students.id] }),
  job: one(jobPostings, { fields: [jobApplications.jobId], references: [jobPostings.id] }),
}));

// 21. CERTIFICATES TABLE
export const certificates = pgTable("certificates", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  certificateCode: varchar("certificate_code", { length: 100 }).notNull().unique(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").$type<{
    avgScore?: number;
    grade?: string;
    digitalSignature?: string;
  }>(),
}, (table) => {
  return {
    tenantCertIdx: index("certificates_tenant_idx").on(table.tenantId),
    studentCertIdx: index("certificates_student_idx").on(table.studentId),
  };
});

export const certificatesRelations = relations(certificates, ({ one }) => ({
  tenant: one(tenants, { fields: [certificates.tenantId], references: [tenants.id] }),
  student: one(students, { fields: [certificates.studentId], references: [students.id] }),
  course: one(courses, { fields: [certificates.courseId], references: [courses.id] }),
}));

// 22. AUDIT LOGS TABLE
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [auditLogs.tenantId], references: [tenants.id] }),
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));

// 23. DIGITAL LIBRARY TABLE
export const digitalLibrary = pgTable("digital_library", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  category: varchar("category", { length: 100 }).notNull().default("book"), // book, research_paper, manual, worksheet
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const digitalLibraryRelations = relations(digitalLibrary, ({ one }) => ({
  tenant: one(tenants, { fields: [digitalLibrary.tenantId], references: [tenants.id] }),
}));

// 24. LESSON PROGRESS TABLE (Real progress tracking)
export const lessonProgress = pgTable("lesson_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    studentLessonIdx: index("lesson_progress_student_lesson_idx").on(table.studentId, table.lessonId),
  };
});

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  student: one(students, { fields: [lessonProgress.studentId], references: [students.id] }),
  lesson: one(lessons, { fields: [lessonProgress.lessonId], references: [lessons.id] }),
}));

// 25. CAPSTONE PROJECTS TABLE
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  difficulty: varchar("difficulty", { length: 50 }).notNull().default("Intermediate"), // Easy, Intermediate, Advanced
  durationWeeks: integer("duration_weeks").notNull().default(4),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, { fields: [projects.tenantId], references: [tenants.id] }),
  course: one(courses, { fields: [projects.courseId], references: [courses.id] }),
  submissions: many(projectSubmissions),
}));

// 26. PROJECT SUBMISSIONS TABLE
export const projectSubmissions = pgTable("project_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  gitRepoUrl: text("git_repo_url").notNull(),
  documentationUrl: text("documentation_url"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, reviewed, changes_requested
  grade: varchar("grade", { length: 50 }),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectSubmissionsRelations = relations(projectSubmissions, ({ one }) => ({
  tenant: one(tenants, { fields: [projectSubmissions.tenantId], references: [tenants.id] }),
  project: one(projects, { fields: [projectSubmissions.projectId], references: [projects.id] }),
  student: one(students, { fields: [projectSubmissions.studentId], references: [students.id] }),
}));




