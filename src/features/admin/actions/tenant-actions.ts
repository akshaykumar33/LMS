"use server";

import { db } from "@/db/db";
import { tenants } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
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
      branding: {
        logoUrl: formData.logoUrl || "",
        primaryColor: formData.primaryColor || "#0ea5e9",
        secondaryColor: formData.secondaryColor || "#0f172a",
        companyName: formData.name,
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
  }
) {
  try {
    const user = await requireAuth(["SuperAdmin"]);
    verifyWriteAccess(user);

    const updated = await db.update(tenants)
      .set({
        name: formData.name,
        subdomain: formData.subdomain.toLowerCase(),
        customDomain: formData.customDomain || null,
        branding: {
          logoUrl: formData.logoUrl || "",
          primaryColor: formData.primaryColor || "#0ea5e9",
          secondaryColor: formData.secondaryColor || "#0f172a",
          companyName: formData.name,
        },
        status: formData.status,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    revalidatePath("/");
    return { success: true, data: updated[0] };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update tenant." };
  }
}
