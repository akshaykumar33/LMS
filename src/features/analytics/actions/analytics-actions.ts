"use server";

import { requireAuth } from "@/features/auth/services/session";
import { getScopedTenantIds } from "@/features/auth/services/tenant";
import { AnalyticsRepository } from "../repository/analytics-repository";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function getAdminAnalyticsAction() {
  try {
    const user = await requireAuth(["Owner", "Admin", "Program Manager", "SuperAdmin"]);
    
    // Resolve all scoped tenant IDs (descendants in hierarchy)
    const tenantIds = await getScopedTenantIds(user.role, user.tenantId);

    // Fetch details for all these tenants
    const tenantDetails = await db.query.tenants.findMany({
      where: inArray(schema.tenants.id, tenantIds),
    }) as any[];

    const tenantDetailsMap = new Map<string, any>(tenantDetails.map((t) => [t.id, t]));

    // Fetch individual analytics for each tenant
    const records = await Promise.all(
      tenantIds.map(async (tid) => {
        const stats = await AnalyticsRepository.getTenantAnalytics(tid);
        const tObj = tenantDetailsMap.get(tid);
        return {
          tenantId: tid,
          tenantName: tObj?.name || "Unknown Organization",
          subdomain: tObj?.subdomain || "",
          parentTenantId: tObj?.parentTenantId || null,
          status: tObj?.status || "active",
          ...stats,
        };
      })
    );

    // Sort: Parent first, then children
    const parentRecord = records.find((r) => r.tenantId === user.tenantId);
    const childRecords = records.filter((r) => r.tenantId !== user.tenantId);
    const sortedRecords = parentRecord ? [parentRecord, ...childRecords] : records;

    // Aggregate overall statistics
    const overall = {
      totalStudents: sortedRecords.reduce((acc, r) => acc + r.totalStudents, 0),
      totalStaff: sortedRecords.reduce((acc, r) => acc + r.totalStaff, 0),
      totalCourses: sortedRecords.reduce((acc, r) => acc + r.totalCourses, 0),
      avgQuizScore: sortedRecords.length > 0 
        ? Math.round(sortedRecords.reduce((acc, r) => acc + r.quizPerformance.avgScore, 0) / sortedRecords.length)
        : 0,
      totalQuizAttempts: sortedRecords.reduce((acc, r) => acc + r.quizPerformance.totalAttempts, 0),
    };

    return {
      success: true,
      data: {
        overall,
        tenants: sortedRecords,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch analytics data." };
  }
}
