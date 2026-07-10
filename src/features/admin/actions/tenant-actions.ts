"use server";

import { db } from "@/db/db";
import { tenants, roles, permissions, rolePermissions } from "@/db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { revalidatePath } from "next/cache";

export async function getAllTenantsAction() {
  try {
    const user = await requireAuth(["SuperAdmin"]);
    const list = await db.query.tenants.findMany({
      orderBy: [asc(tenants.name)],
    });
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
}) {
  try {
    const user = await requireAuth(["SuperAdmin"]);
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

    const newTenant = await db.insert(tenants).values({
      name: formData.name,
      subdomain: formData.subdomain.toLowerCase(),
      customDomain: formData.customDomain || null,
      parentTenantId: formData.parentTenantId || null,
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
  }
) {
  try {
    const user = await requireAuth(["SuperAdmin"]);
    verifyWriteAccess(user);

    const updateFields: any = {
      name: formData.name,
      subdomain: formData.subdomain.toLowerCase(),
      customDomain: formData.customDomain || null,
      parentTenantId: formData.parentTenantId || null,
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
      updateFields.settings = formData.settings;
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
    const user = await requireAuth(["SuperAdmin"]);
    
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
    const user = await requireAuth(["SuperAdmin"]);
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

import { getScopedTenantIds } from "@/features/auth/services/tenant";

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
