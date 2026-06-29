import { requireAuth } from "@/features/auth/services/session";
import { db } from "@/db/db";
import { tenants, users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { SuperAdminConsole } from "./SuperAdminConsole";
import { DashboardLayout } from "@/components/DashboardLayout";

export default async function SuperAdminPage() {
  // Enforce global Super Admin permissions
  const user = await requireAuth(["SuperAdmin"]);
  const allTenants = await db.query.tenants.findMany({
    orderBy: [asc(tenants.name)],
  });

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.userId),
  });

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Super",
    lastName: dbUser?.lastName || "Admin",
    email: dbUser?.email || user.email,
    role: user.role,
  };

  const globalTenant = {
    id: "global",
    name: "System Registry",
    subdomain: "vt",
    branding: {
      primaryColor: "#0ea5e9",
      secondaryColor: "#0f172a",
      companyName: "Virginia Tech LMS",
    },
  };

  return (
    <DashboardLayout user={userData} tenant={globalTenant}>
      <SuperAdminConsole initialTenants={allTenants} user={userData} />
    </DashboardLayout>
  );
}
