import { headers, cookies } from "next/headers";
import { db } from "@/db/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface TenantContext {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
  } | null;
  status: string;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const headersList = await headers();
  let subdomain = headersList.get("x-tenant-subdomain");

  if (!subdomain) {
    const cookieStore = await cookies();
    subdomain = cookieStore.get("x-tenant-subdomain")?.value || null;
  }

  if (!subdomain) {
    return null;
  }

  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.subdomain, subdomain),
    });

    if (!tenant) {
      return null;
    }

    let branding = tenant.branding;
    if (branding) {
      let primary = branding.primaryColor || "#0ea5e9";
      const secondary = branding.secondaryColor || "#1e293b";
      if (primary === "#000000" || primary.toLowerCase() === "black") {
        primary = secondary !== "#000000" ? secondary : "#0ea5e9";
      }
      branding = {
        ...branding,
        primaryColor: primary,
      };
    }

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      branding,
      status: tenant.status,
    };
  } catch (error) {
    console.error("Failed to fetch tenant context:", error);
    return null;
  }
}

export async function getScopedTenantIds(userRole: string, currentTenantId: string): Promise<string[]> {
  if (userRole === "SuperAdmin") {
    try {
      const allTenants = await db.query.tenants.findMany();
      return allTenants.map(t => t.id);
    } catch (e) {
      console.error("Failed to query all tenants for SuperAdmin:", e);
    }
  }

  const allowedRoles = ["Owner", "Admin", "Program Manager"];
  if (!allowedRoles.includes(userRole)) {
    return [currentTenantId];
  }

  try {
    const currentTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, currentTenantId),
    });

    if (!currentTenant) return [currentTenantId];

    if (!currentTenant.parentTenantId) {
      const children = await db.query.tenants.findMany({
        where: eq(tenants.parentTenantId, currentTenantId),
      });
      if (children.length > 0) {
        return [currentTenantId, ...children.map(c => c.id)];
      }
    }
  } catch (error) {
    console.error("Error determining scoped tenant IDs:", error);
  }

  return [currentTenantId];
}
