import { headers, cookies } from "next/headers";
import { db } from "@/db/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isParentSubdomain } from "./is-parent-tenant";

export interface TenantContext {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  parentTenantId: string | null;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
  } | null;
  status: string;
  isPlacementEnabled: boolean;
  settings?: {
    features?: {
      enableLibrary?: boolean;
      enablePlacement?: boolean;
      enableProctoring?: boolean;
      enableCertificates?: boolean;
      enableCapstone?: boolean;
    };
    gateways?: {
      stripe?: boolean;
      razorpay?: boolean;
      paypal?: boolean;
    };
    restrictions?: {
      maxUsers?: number;
      maxCourses?: number;
      allowSelfSignup?: boolean;
    };
    tuitionFee?: string;
    paymentRequired?: boolean;
  } | null;
}

import { verifyAccessToken } from "./jwt";

export async function getTenantContext(): Promise<TenantContext | null> {
  const headersList = await headers();
  let subdomain = headersList.get("x-tenant-subdomain");

  if (!subdomain) {
    const cookieStore = await cookies();
    subdomain = cookieStore.get("x-tenant-subdomain")?.value || null;
    if (!subdomain) {
      const token = cookieStore.get("access_token")?.value;
      if (token) {
        const payload = verifyAccessToken(token);
        if (payload?.subdomain) {
          subdomain = payload.subdomain;
        }
      }
    }
  }

  try {
    let tenant: any = null;
    if (subdomain) {
      tenant = await db.query.tenants.findFirst({
        where: eq(tenants.subdomain, subdomain.toLowerCase().trim()),
      });
    }

    if (!tenant) {
      tenant = await db.query.tenants.findFirst({
        where: eq(tenants.status, "active"),
      });
    }

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

    // Resolve hierarchical placements flag by walking up parentTenantId chain
    let isPlacementEnabled = true;
    try {
      const allTenants = await db.query.tenants.findMany();
      const tenantMap = new Map<string, any>(allTenants.map(t => [t.id, t]));
      let current = tenantMap.get(tenant.id);
      while (current) {
        const features = current.settings?.features;
        if (features && features.enablePlacement === false) {
          isPlacementEnabled = false;
          break;
        }
        if (!current.parentTenantId) break;
        current = tenantMap.get(current.parentTenantId);
      }
    } catch (e) {
      console.error("Failed to resolve placement hierarchy:", e);
    }

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      parentTenantId: tenant.parentTenantId,
      branding,
      status: tenant.status,
      isPlacementEnabled,
      settings: tenant.settings as any,
    };
  } catch (error) {
    console.error("Failed to fetch tenant context:", error);
    return null;
  }
}

export async function getScopedTenantIds(userRole: string, currentTenantId: string): Promise<string[]> {
  try {
    const allTenants = await db.query.tenants.findMany();
    const currentTenant = allTenants.find(t => t.id === currentTenantId);

    if (userRole === "SuperAdmin") {
      const currentSub = currentTenant?.subdomain || "";
      const isOnParentDomain = await isParentSubdomain(currentSub);

      if (isOnParentDomain) {
        return allTenants.map(t => t.id);
      }
    }

    const allowedRoles = ["Owner", "Admin", "Program Manager", "SuperAdmin"];
    if (!allowedRoles.includes(userRole)) {
      return [currentTenantId];
    }

    // parentId -> childIds[] map
    const tenantMap = new Map<string, string[]>();
    for (const t of allTenants) {
      if (t.parentTenantId) {
        const list = tenantMap.get(t.parentTenantId) || [];
        list.push(t.id);
        tenantMap.set(t.parentTenantId, list);
      }
    }

    // BFS to find all descendants at any nesting depth
    const resultIds = new Set<string>();
    const queue = [currentTenantId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!resultIds.has(current)) {
        resultIds.add(current);
        const children = tenantMap.get(current) || [];
        queue.push(...children);
      }
    }

    return Array.from(resultIds);
  } catch (error) {
    console.error("Error determining scoped tenant IDs:", error);
  }

  return [currentTenantId];
}


