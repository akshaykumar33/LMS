import { redirect } from "next/navigation";
import { getTenantContext, getScopedTenantIds } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { AdmissionRepository } from "@/features/admission/repository/admission-repository";
import { AdmissionsDashboard } from "@/features/admission/components/AdmissionsDashboard";
import { logoutAction } from "@/features/auth/actions/auth-actions";
import { db, dbSubdomainStorage } from "@/db/db";
import { batches, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { DashboardLayout } from "@/components/DashboardLayout";

export default async function AdminAdmissionsPage() {
  // 1. Resolve tenant context
  const tenant = await getTenantContext();
  if (!tenant) {
    redirect("/");
  }

  // 2. Enforce authentication and administrative roles
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);

  // 3. Resolve scoped tenant IDs for hierarchy
  const scopedTenantIds = await getScopedTenantIds(user.role, user.tenantId || tenant.id);

  // 4. Load applications list
  const apps = await AdmissionRepository.listApplications(scopedTenantIds);

  // 5. Load batches list
  const batchesList = await db.query.batches.findMany({
    where: inArray(batches.tenantId, scopedTenantIds),
  });

  // Action wrapper for logout
  const handleLogout = async () => {
    "use server";
    await logoutAction();
    redirect("/login");
  };

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

  return (
    <DashboardLayout user={userData} tenant={tenant}>
      <AdmissionsDashboard
        initialApplications={apps.map((a: any) => ({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          phone: a.phone,
          status: a.status,
          createdAt: a.createdAt,
          batch: a.batch ? { id: a.batch.id, name: a.batch.name } : null,
          payments: a.payments.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            status: p.status,
            paymentMethod: p.paymentMethod,
            transactionId: p.transactionId,
          })),
        }))}
        batches={batchesList.map((b: any) => ({ id: b.id, name: b.name }))}
        primaryColor={tenant.branding?.primaryColor}
        logoutHandler={handleLogout}
        userRole={user.role}
        tenantSubdomain={tenant.subdomain}
      />
    </DashboardLayout>
  );
}
