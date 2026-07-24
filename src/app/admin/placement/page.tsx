import { redirect } from "next/navigation";
import { getTenantContext, getScopedTenantIds } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { GuestSandboxBanner } from "@/components/GuestSandboxBanner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CareerRepository } from "@/features/career/repository/career-repository";
import { PlacementConsole } from "@/features/career/components/PlacementConsole";
import { db, dbSubdomainStorage } from "@/db/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminPlacementPage() {
  redirect("/admin/admissions");
}
