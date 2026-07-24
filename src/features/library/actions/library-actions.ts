"use server";

import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createLibraryItemAction(formData: {
  title: string;
  author: string;
  description: string;
  fileUrl: string;
  category: string;
  // ── Metadata fields ────────────────────────────────────────────────────
  tags?: string[];
  targetCourseIds?: string[];
  format?: string;
  metadata?: {
    readingLevel?: "beginner" | "intermediate" | "advanced";
    language?: string;
    pageCount?: number;
    aiIndexed?: boolean;
    aiSummary?: string;
    aiKeywords?: string[];
  };
}) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Faculty", "Program Manager"]);
    verifyWriteAccess(user);

    if (!formData.title || !formData.fileUrl) {
      return { success: false, error: "Title and File URL are required." };
    }

    await db.insert(schema.digitalLibrary).values({
      tenantId: user.tenantId,
      title: formData.title,
      author: formData.author || null,
      description: formData.description || null,
      fileUrl: formData.fileUrl,
      category: formData.category,
      tags: formData.tags?.length ? formData.tags : null,
      targetCourseIds: formData.targetCourseIds?.length ? formData.targetCourseIds : null,
      format: formData.format || null,
      metadata: formData.metadata || null,
    });

    revalidatePath("/library");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create resource." };
  }
}

export async function updateLibraryItemAction(
  id: string,
  formData: {
    title: string;
    author: string;
    description: string;
    fileUrl: string;
    category: string;
    // ── Metadata fields ────────────────────────────────────────────────────
    tags?: string[];
    targetCourseIds?: string[];
    format?: string;
    metadata?: {
      readingLevel?: "beginner" | "intermediate" | "advanced";
      language?: string;
      pageCount?: number;
      aiIndexed?: boolean;
      aiSummary?: string;
      aiKeywords?: string[];
    };
  }
) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Faculty", "Program Manager"]);
    verifyWriteAccess(user);

    if (!formData.title || !formData.fileUrl) {
      return { success: false, error: "Title and File URL are required." };
    }

    // Verify item belongs to tenant
    const item = await db.query.digitalLibrary.findFirst({
      where: and(
        eq(schema.digitalLibrary.id, id),
        eq(schema.digitalLibrary.tenantId, user.tenantId)
      ),
    });

    if (!item) {
      return { success: false, error: "Resource not found." };
    }

    await db
      .update(schema.digitalLibrary)
      .set({
        title: formData.title,
        author: formData.author || null,
        description: formData.description || null,
        fileUrl: formData.fileUrl,
        category: formData.category,
        tags: formData.tags?.length ? formData.tags : null,
        targetCourseIds: formData.targetCourseIds?.length ? formData.targetCourseIds : null,
        format: formData.format || null,
        metadata: formData.metadata || null,
      })
      .where(eq(schema.digitalLibrary.id, id));

    revalidatePath("/library");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update resource." };
  }
}

export async function deleteLibraryItemAction(id: string) {
  try {
    const user = await requireAuth(["Owner", "Admin", "Faculty", "Program Manager"]);
    verifyWriteAccess(user);

    // Verify item belongs to tenant
    const item = await db.query.digitalLibrary.findFirst({
      where: and(
        eq(schema.digitalLibrary.id, id),
        eq(schema.digitalLibrary.tenantId, user.tenantId)
      ),
    });

    if (!item) {
      return { success: false, error: "Resource not found." };
    }

    await db.delete(schema.digitalLibrary).where(eq(schema.digitalLibrary.id, id));

    revalidatePath("/library");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete resource." };
  }
}

