import { db } from "@/db/db";
import { jobPostings, jobApplications } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export class CareerRepository {
  /**
   * Get all job postings for a tenant.
   */
  static async getJobPostings(tenantId: string | string[], onlyActive = true) {
    const condition = Array.isArray(tenantId)
      ? (onlyActive
          ? and(inArray(jobPostings.tenantId, tenantId), eq(jobPostings.isActive, true))
          : inArray(jobPostings.tenantId, tenantId))
      : (onlyActive
          ? and(eq(jobPostings.tenantId, tenantId), eq(jobPostings.isActive, true))
          : eq(jobPostings.tenantId, tenantId));

    return db.query.jobPostings.findMany({
      where: condition,
      orderBy: [desc(jobPostings.createdAt)],
    });
  }

  /**
   * Get job posting details.
   */
  static async getJobDetails(tenantId: string, jobId: string) {
    return db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.tenantId, tenantId), eq(jobPostings.id, jobId)),
    });
  }

  /**
   * Get all applications submitted by a student.
   */
  static async getStudentApplications(tenantId: string, studentId: string) {
    return db.query.jobApplications.findMany({
      where: and(
        eq(jobApplications.tenantId, tenantId),
        eq(jobApplications.studentId, studentId)
      ),
      with: {
        job: true,
      },
      orderBy: [desc(jobApplications.createdAt)],
    });
  }

  /**
   * Submit a new job application.
   */
  static async applyToJob(tenantId: string, studentId: string, jobId: string, resumeUrl: string) {
    // Check if already applied
    const existing = await db.query.jobApplications.findFirst({
      where: and(
        eq(jobApplications.tenantId, tenantId),
        eq(jobApplications.studentId, studentId),
        eq(jobApplications.jobId, jobId)
      ),
    });

    if (existing) {
      throw new Error("You have already applied for this job.");
    }

    const [newApp] = await db
      .insert(jobApplications)
      .values({
        tenantId,
        studentId,
        jobId,
        resumeUrl,
        status: "applied",
      })
      .returning();

    return newApp;
  }

  /**
   * Create a new job posting (Admin/Faculty action).
   */
  static async createJobPosting(
    tenantId: string,
    title: string,
    company: string,
    description: string,
    requirements: string,
    salary: string,
    location: string
  ) {
    const [newJob] = await db
      .insert(jobPostings)
      .values({
        tenantId,
        title,
        company,
        description,
        requirements,
        salary,
        location,
        isActive: true,
      })
      .returning();

    return newJob;
  }

  /**
   * Update an existing job posting.
   */
  static async updateJobPosting(
    tenantId: string,
    jobId: string,
    updates: {
      title: string;
      company: string;
      description: string;
      requirements: string;
      salary: string;
      location: string;
    }
  ) {
    const [updatedJob] = await db
      .update(jobPostings)
      .set({
        title: updates.title,
        company: updates.company,
        description: updates.description,
        requirements: updates.requirements,
        salary: updates.salary,
        location: updates.location,
        updatedAt: new Date(),
      })
      
    return updatedJob;
  }

  /**
   * Delete a job posting.
   */
  static async deleteJobPosting(tenantId: string, jobId: string) {
    return db
      .delete(jobPostings)
      .where(and(eq(jobPostings.id, jobId), eq(jobPostings.tenantId, tenantId)));
  }

  /**
   * Get all applications for a specific job posting.
   */
  static async getJobApplicationsForJob(tenantId: string | string[], jobId: string) {
    const tenantIds = Array.isArray(tenantId) ? tenantId : [tenantId];

    const apps = await db.query.jobApplications.findMany({
      where: and(
        inArray(jobApplications.tenantId, tenantIds),
        eq(jobApplications.jobId, jobId)
      ),
      with: {
        student: {
          with: {
            user: true,
          },
        },
      },
      orderBy: [desc(jobApplications.createdAt)],
    });

    return apps.map((app: any) => ({
      applicationId: app.id,
      status: app.status,
      resumeUrl: app.resumeUrl,
      createdAt: app.createdAt,
      studentId: app.student?.id ?? null,
      rollNumber: app.student?.rollNumber ?? null,
      firstName: app.student?.user?.firstName ?? "Unknown",
      lastName: app.student?.user?.lastName ?? "",
      email: app.student?.user?.email ?? "",
    }));
  }

  /**
   * Update the status of a job application.
   */
  static async updateApplicationStatus(tenantId: string, applicationId: string, status: string) {
    const [updated] = await db
      .update(jobApplications)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(jobApplications.id, applicationId),
          eq(jobApplications.tenantId, tenantId)
        )
      )
      .returning();

    return updated;
  }
}
