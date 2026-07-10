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

  // Normalize alias subdomains to canonical form
  const aliasMap: Record<string, string> = { vti: "vt", vtu: "vt" };
  subdomain = aliasMap[subdomain.toLowerCase()] || subdomain;

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
  try {
    const allTenants = await db.query.tenants.findMany();
    const currentTenant = allTenants.find(t => t.id === currentTenantId);

    if (userRole === "SuperAdmin") {
      const parentDomains = ["vt", "vti", "vtu", "test1", "localhost", "", "www"];
      const currentSub = currentTenant?.subdomain || "";
      const isOnParentDomain = parentDomains.includes(currentSub.toLowerCase());

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
