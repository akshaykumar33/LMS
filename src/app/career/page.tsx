import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { CareerRepository } from "@/features/career/repository/career-repository";
import { db, dbSubdomainStorage } from "@/db/db";
import { students, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AnalyticsRepository } from "@/features/analytics/repository/analytics-repository";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StudentCareerPortal } from "@/features/career/components/StudentCareerPortal";

export default async function CareerPage() {
  redirect("/dashboard");
}
