import { requireAuth } from "@/features/auth/services/session";
import { db, dbSubdomainStorage } from "@/db/db";
import { tenants, users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { SuperAdminConsole } from "./SuperAdminConsole";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getScopedTenantIds, getTenantContext } from "@/features/auth/services/tenant";

export const metadata = {
  title: "Super Admin Console",
};

export default async function SuperAdminPage() {
  // Enforce global Super Admin / Parent Owner permissions
  const user = await requireAuth(["SuperAdmin", "Owner"]);

  const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
    await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    })
  );


  const userTenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, dbUser?.tenantId || ""),
  });

  const activeTenantCtx = await getTenantContext();
  const tenant = activeTenantCtx || userTenant;



  let allTenants = await db.query.tenants.findMany({
    orderBy: [asc(tenants.name)],
  });

  if (user.role === "Owner" && dbUser?.tenantId) {
    const allowedIds = await getScopedTenantIds("Owner", dbUser.tenantId);
    allTenants = allTenants.filter(t => allowedIds.includes(t.id));
  }

  const userData = {
    userId: user.userId,
    firstName: (dbUser?.email === "superadmin@vt.edu" || dbUser?.email === "superadmin@wysbryx.com") ? "Wysbryx" : (dbUser?.firstName || "Super"),
    lastName: (dbUser?.email === "superadmin@vt.edu" || dbUser?.email === "superadmin@wysbryx.com") ? "Super Admin" : (dbUser?.lastName || "Admin"),
    email: (dbUser?.email === "superadmin@vt.edu" || dbUser?.email === "superadmin@wysbryx.com") ? "superadmin@wysbryx.com" : (dbUser?.email || user.email),
    role: user.role,
    subdomain: user.subdomain,
  };

  const globalTenant = {
    id: tenant?.id || "global",
    name: tenant?.name || "Wysbryx Platform",
    subdomain: tenant?.subdomain || "wysbryx",
    branding: tenant?.branding || {
      primaryColor: "#f97316",
      secondaryColor: "#0f172a",
      companyName: "Wysbryx Platform",
    },
  };

  return (
    <DashboardLayout user={userData} tenant={globalTenant} isParentOrg={true}>
      <Suspense fallback={null}>
        <SuperAdminConsole initialTenants={allTenants} user={userData} />
      </Suspense>
    </DashboardLayout>
  );
}
