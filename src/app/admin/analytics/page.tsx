import React from "react";
import { getAdminAnalyticsAction } from "@/features/analytics/actions/analytics-actions";
import { requireAuth } from "@/features/auth/services/session";
import { getTenantContext } from "@/features/auth/services/tenant";
import AnalyticsConsole from "./AnalyticsConsole";
import { DashboardLayout } from "@/components/DashboardLayout";
import { db, dbSubdomainStorage } from "@/db/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function AdminAnalyticsPage() {
  // 1. Authenticate user is authorized to read analytics
  let user;
  try {
    user = await requireAuth(["Owner", "Admin", "Program Manager", "SuperAdmin"]);
  } catch {
    redirect("/login");
  }

  // 2. Fetch tenant context
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  // 3. Fetch analytics
  const res = await getAdminAnalyticsAction();

  const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
    await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    })
  );

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Admin",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
    subdomain: user.subdomain,
  };

  if (!res.success || !res.data) {
    return (
      <DashboardLayout user={userData} tenant={tenant}>
        <div className="p-8 text-center space-y-2">
          <h2 className="text-xl font-bold text-red-400">Failed to load analytics data</h2>
          <p className="text-sm text-muted-foreground">{res.error || "An unexpected error occurred."}</p>
        </div>
      </DashboardLayout>
    );
  }

  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";

  return (
    <DashboardLayout user={userData} tenant={tenant}>
      <AnalyticsConsole
        initialData={res.data}
        userRole={user.role}
        primaryColor={primaryColor}
      />
    </DashboardLayout>
  );
}
