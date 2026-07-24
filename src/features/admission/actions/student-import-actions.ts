"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { getTenantContext } from "@/features/auth/services/tenant";
import { dbSubdomainStorage } from "@/db/db";
import { validateAndImportStudents, ImportStudentRow } from "../services/student-import";

export async function importStudentsAction(batchId: string, rows: ImportStudentRow[]) {
  // 1. Authenticate user
  const user = await requireAuth(["Owner", "Admin", "Program Manager"]);
  verifyWriteAccess(user);

  // 2. Resolve tenant context
  const tenant = await getTenantContext();
  if (!tenant) {
    return { success: false, error: "Tenant context not found" };
  }

  try {
    // 3. Execute import service in tenant's subdomain storage context
    const result = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () => {
      return await validateAndImportStudents(tenant.id, batchId, rows);
    });

    if (result.success) {
      revalidatePath("/admin/admissions");
    }

    return result;
  } catch (error) {
    console.error("importStudentsAction failed:", error);
    const errMsg = error instanceof Error ? error.message : "Action failed due to internal error";
    return {
      success: false,
      importedCount: 0,
      errors: [{ row: 0, field: "action", message: errMsg }]
    };
  }
}
