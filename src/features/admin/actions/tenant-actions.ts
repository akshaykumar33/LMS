"use server";

import { db, dbSubdomainStorage } from "@/db/db";
import { tenants, roles, permissions, rolePermissions, users } from "@/db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { revalidatePath } from "next/cache";
import { getScopedTenantIds } from "@/features/auth/services/tenant";

async function verifyGlobalAdmin(user: any) {
  if (user.role === "Owner") {
    const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
      await db.query.users.findFirst({
        where: eq(users.id, user.userId),
      })
    );
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, dbUser?.tenantId || ""),
    });
    if (!tenant) {
      throw new Error("FORBIDDEN: Tenant not found for this user.");
    }
    // Owner must have child sub-tenants to be considered a global admin
    const childTenants = await db.query.tenants.findMany({
      where: and(eq(tenants.status, "active"), eq(tenants.parentTenantId, tenant.id)),
    });
    if (childTenants.length === 0) {
      throw new Error("FORBIDDEN: Leaf-tenant owners are not authorized to perform global administration tasks.");
    }
  }
}

export async function getAllTenantsAction() {
  try {
    const user = await requireAuth(["SuperAdmin", "Owner"]);
    await verifyGlobalAdmin(user);

    const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
      await db.query.users.findFirst({
        where: eq(users.id, user.userId),
      })
    );
    const userTenantId = dbUser?.tenantId;

    let list = await db.query.tenants.findMany({
      orderBy: [asc(tenants.name)],
    });

    if (user.role === "Owner" && userTenantId) {
      const allowedIds = await getScopedTenantIds("Owner", userTenantId);
      list = list.filter(t => allowedIds.includes(t.id));
    }

    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch tenants." };
  }
}

export async function createTenantAction(formData: {
  name: string;
  subdomain: string;
  customDomain?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  parentTenantId?: string;
  dbName?: string;
  dbUrl?: string;
}) {
  try {
    const user = await requireAuth(["SuperAdmin", "Owner"]);
    await verifyGlobalAdmin(user);
    verifyWriteAccess(user);

    if (!formData.name || !formData.subdomain) {
      return { success: false, error: "Name and subdomain are required." };
    }

    // Check for unique subdomain
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.subdomain, formData.subdomain),
    });
    if (existing) {
      return { success: false, error: "Subdomain is already taken." };
    }

    const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
      await db.query.users.findFirst({
        where: eq(users.id, user.userId),
      })
    );
    const userTenantId = dbUser?.tenantId;

    let parentId = formData.parentTenantId || null;
    if (user.role === "Owner" && userTenantId) {
      const allowedIds = await getScopedTenantIds("Owner", userTenantId);
      if (!parentId) {
        parentId = userTenantId; // default to the owner's tenant
      } else if (!allowedIds.includes(parentId)) {
        return { success: false, error: "FORBIDDEN: Parent tenant must be within your hierarchy branch." };
      }
    }

    const newTenant = await db.insert(tenants).values({
      name: formData.name,
      subdomain: formData.subdomain.toLowerCase(),
      customDomain: formData.customDomain || null,
      parentTenantId: parentId,
      dbName: formData.dbName || null,
      branding: {
        logoUrl: formData.logoUrl || "",
        primaryColor: formData.primaryColor || "#0ea5e9",
        secondaryColor: formData.secondaryColor || "#0f172a",
        companyName: formData.name,
      },
      settings: {
        features: {
          enableLibrary: true,
          enablePlacement: true,
          enableProctoring: true,
          enableCertificates: true,
        },
        gateways: {
          stripe: true,
          razorpay: true,
          paypal: true,
        },
        restrictions: {
          maxUsers: 200,
          maxCourses: 50,
          allowSelfSignup: true,
        },
        database: {
          dbUrl: formData.dbUrl || "",
        }
      },
      status: "active",
    }).returning();

    revalidatePath("/");
    return { success: true, data: newTenant[0] };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create tenant." };
  }
}

export async function updateTenantAction(
  id: string,
  formData: {
    name: string;
    subdomain: string;
    customDomain?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    status: string;
    settings?: any;
    parentTenantId?: string | null;
    dbName?: string;
    dbUrl?: string;
  }
) {
  try {
    const user = await requireAuth(["SuperAdmin", "Owner"]);
    await verifyGlobalAdmin(user);
    verifyWriteAccess(user);

    const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
      await db.query.users.findFirst({
        where: eq(users.id, user.userId),
      })
    );
    const userTenantId = dbUser?.tenantId;

    let parentId = formData.parentTenantId || null;
    if (user.role === "Owner" && userTenantId) {
      const allowedIds = await getScopedTenantIds("Owner", userTenantId);
      // Ensure the tenant being updated is within their branch
      const targetTenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, id),
      });
      if (!targetTenant || !allowedIds.includes(targetTenant.id)) {
        return { success: false, error: "FORBIDDEN: You do not have permission to modify this tenant." };
      }
      // Ensure the new parent is also within their branch
      if (parentId && !allowedIds.includes(parentId)) {
        return { success: false, error: "FORBIDDEN: New parent tenant must be within your hierarchy branch." };
      }
    }

    const updateFields: any = {
      name: formData.name,
      subdomain: formData.subdomain.toLowerCase(),
      customDomain: formData.customDomain || null,
      parentTenantId: parentId,
      dbName: formData.dbName || null,
      branding: {
        logoUrl: formData.logoUrl || "",
        primaryColor: formData.primaryColor || "#0ea5e9",
        secondaryColor: formData.secondaryColor || "#0f172a",
        companyName: formData.name,
      },
      status: formData.status,
      updatedAt: new Date(),
    };

    if (formData.settings) {
      updateFields.settings = {
        ...formData.settings,
        database: {
          dbUrl: formData.dbUrl || "",
        }
      };
    }

    const updated = await db.update(tenants)
      .set(updateFields)
      .where(eq(tenants.id, id))
      .returning();

    revalidatePath("/");
    return { success: true, data: updated[0] };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update tenant." };
  }
}

export async function getTenantPermissionsAction(tenantId: string) {
  try {
    const user = await requireAuth(["SuperAdmin", "Owner"]);
    await verifyGlobalAdmin(user);

    const dbUser = await dbSubdomainStorage.run(user.subdomain || "wysbryx", async () =>
      await db.query.users.findFirst({
        where: eq(users.id, user.userId),
      })
    );
    if (user.role === "Owner" && dbUser?.tenantId) {
      const allowedIds = await getScopedTenantIds("Owner", dbUser.tenantId);
      if (!allowedIds.includes(tenantId)) {
        return { success: false, error: "FORBIDDEN: You do not have permission to view this tenant's permissions." };
      }
    }
    
    // Get all roles for this tenant
    const tenantRoles = await db.query.roles.findMany({
      where: eq(roles.tenantId, tenantId),
      orderBy: [asc(roles.name)],
    });

    // Get all global permissions
    const allPermissions = await db.query.permissions.findMany({
      orderBy: [asc(permissions.name)],
    });

    // Get all current role-permission mappings for these roles
    const roleIds = tenantRoles.map(r => r.id);
    let mappings: any[] = [];
    if (roleIds.length > 0) {
      mappings = await db.query.rolePermissions.findMany({
        where: inArray(rolePermissions.roleId, roleIds),
      });
    }

    return { 
      success: true, 
      roles: tenantRoles, 
      permissions: allPermissions, 
      mappings 
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch permissions mapping." };
  }
}

export async function toggleRolePermissionAction(roleId: string, permissionId: string, enable: boolean) {
  try {
    const user = await requireAuth(["SuperAdmin", "Owner"]);
    await verifyGlobalAdmin(user);
    verifyWriteAccess(user);

    if (enable) {
      try {
        await db.insert(rolePermissions).values({
          roleId,
          permissionId,
        });
      } catch (e) {
        // Ignore duplicate conflicts
      }
    } else {
      await db.delete(rolePermissions).where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permissionId, permissionId)
        )
      );
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle permission." };
  }
}



export async function getSwitchableTenantsAction() {
  try {
    const user = await requireAuth(["Owner", "Admin", "Program Manager", "SuperAdmin"]);
    
    const list = await db.query.tenants.findMany({
      orderBy: [asc(tenants.name)],
    });

    if (user.role === "SuperAdmin") {
      return { success: true, data: list };
    }

    const scopedIds = await getScopedTenantIds(user.role, user.tenantId);
    const filtered = list.filter(t => scopedIds.includes(t.id));
    return { success: true, data: filtered };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch switchable tenants." };
  }
}
