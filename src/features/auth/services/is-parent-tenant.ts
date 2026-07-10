import { db } from "@/db/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Module-level cache to avoid repeated DB lookups within the same process.
 * Maps subdomain -> isParent boolean.
 */
const parentCache = new Map<string, boolean>();

/**
 * Infrastructure subdomains that are always treated as platform root.
 * These don't exist as tenant rows in the database.
 */
const INFRASTRUCTURE_SUBDOMAINS = ["localhost", "", "www", "127.0.0.1", "wysbryx"];

/**
 * Determines whether a given subdomain belongs to a parent/root-level tenant
 * by checking the database for `parentTenantId IS NULL`.
 *
 * Infrastructure subdomains (localhost, www, "", wysbryx) always return true.
 * Any tenant whose parentTenantId is null is a parent. Child tenants return false.
 *
 * Results are cached per-process to avoid redundant DB queries.
 */
export async function isParentSubdomain(subdomain: string): Promise<boolean> {
  const normalized = subdomain.toLowerCase().trim();

  // Infrastructure subdomains are always parent-level (platform root)
  if (INFRASTRUCTURE_SUBDOMAINS.includes(normalized)) {
    return true;
  }

  // Check cache first
  if (parentCache.has(normalized)) {
    return parentCache.get(normalized)!;
  }

  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.subdomain, normalized),
    });

    // If tenant not found in DB, treat as parent (platform root)
    if (!tenant) {
      parentCache.set(normalized, true);
      return true;
    }

    // A tenant is a "parent" if its parentTenantId is null
    const isParent = tenant.parentTenantId === null;
    parentCache.set(normalized, isParent);
    return isParent;
  } catch (error) {
    console.error("[isParentSubdomain] DB lookup failed:", error);
    // Fail-open to parent for safety (restricts access rather than leaking)
    return true;
  }
}

/**
 * Synchronous version that derives parent status from an already-loaded tenant context.
 * Use this when you already have the tenant object (e.g. in client components via props).
 */
export function isParentTenant(tenant: { parentTenantId: string | null } | null): boolean {
  if (!tenant) return true; // No tenant context = platform root
  return tenant.parentTenantId === null;
}

/**
 * Checks if a tenant is the absolute root (Wysbryx platform).
 * Root tenants have parentTenantId === null.
 */
export function isRootTenant(tenant: { parentTenantId: string | null; subdomain?: string } | null): boolean {
  if (!tenant) return true;
  return tenant.parentTenantId === null;
}

/**
 * Walks the parentTenantId chain upward to build the full ancestor chain
 * for a given tenant ID, returning an array of tenant IDs from child → root.
 */
export async function getAncestorChain(tenantId: string): Promise<string[]> {
  try {
    const allTenants = await db.query.tenants.findMany();
    const tenantMap = new Map<string, any>(allTenants.map(t => [t.id, t]));
    const chain: string[] = [];
    let current = tenantMap.get(tenantId);
    while (current) {
      chain.push(current.id);
      if (!current.parentTenantId) break;
      current = tenantMap.get(current.parentTenantId);
    }
    return chain;
  } catch (error) {
    console.error("[getAncestorChain] DB lookup failed:", error);
    return [tenantId];
  }
}

/**
 * Checks whether `ancestorTenantId` is an ancestor of `descendantTenantId`
 * by walking the hierarchy upward from the descendant.
 */
export async function isAncestorOf(ancestorTenantId: string, descendantTenantId: string): Promise<boolean> {
  if (ancestorTenantId === descendantTenantId) return true;
  const chain = await getAncestorChain(descendantTenantId);
  return chain.includes(ancestorTenantId);
}
