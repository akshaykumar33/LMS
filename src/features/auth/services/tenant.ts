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

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      branding: tenant.branding,
      status: tenant.status,
    };
  } catch (error) {
    console.error("Failed to fetch tenant context:", error);
    return null;
  }
}
