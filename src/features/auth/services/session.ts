import { cookies } from "next/headers";
import { verifyAccessToken, UserTokenPayload } from "./jwt";
import { db, dbSubdomainStorage } from "@/db/db";
import { users, tenants, roles, rolePermissions, permissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTenantContext, getScopedTenantIds } from "./tenant";

/**
 * Retrieve the current authenticated user session from JWT HttpOnly cookies.
 */
export async function getCurrentUser(): Promise<UserTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    
    if (!token) {
      return null;
    }

    const payload = verifyAccessToken(token);
    if (!payload) return null;

    // Resolve user subdomain using payload.subdomain
    const userSubdomain = payload.subdomain;

    // Verify user exists in their registered tenant's schema
    let exists = null;
    if (userSubdomain) {
      exists = await dbSubdomainStorage.run(userSubdomain, async () =>
        await db.query.users.findFirst({
          where: eq(users.id, payload.userId),
        })
      );
    }

    if (!exists) {
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      return null;
    }

    return payload;
  } catch (error: any) {
    if (error && (error.digest === "DYNAMIC_SERVER_USAGE" || error.message?.includes("Dynamic server usage"))) {
      throw error;
    }
    console.error("Failed to retrieve user session:", error);
    return null;
  }
}

/**
 * Enforce authentication and optional role restrictions on actions or routes.
 */
export async function requireAuth(allowedRoles?: string[]): Promise<UserTokenPayload> {
  const user = await getCurrentUser();

  if (!user) {
    // Redirect to active tenant's login page if available
    const activeTenant = await getTenantContext();
    if (activeTenant && activeTenant.subdomain !== "wysbryx") {
      redirect(`/login?tenant=${activeTenant.subdomain}`);
    }
    redirect("/login");
  }

  // Cross-tenant session protection on single domain
  const activeTenant = await getTenantContext();
  if (activeTenant && user.role !== "SuperAdmin") {
    const allowedTenantIds = await getScopedTenantIds(user.role, user.tenantId || activeTenant.id);
    if (!allowedTenantIds || !allowedTenantIds.includes(activeTenant.id)) {
      const cookieStore = await cookies();
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      redirect(`/login?tenant=${activeTenant.subdomain}`);
    }
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role) && user.role !== "Guest" && user.role !== "SuperAdmin") {
    throw new Error(`FORBIDDEN: User role '${user.role}' is not authorized to access this resource.`);
  }

  return user;
}

/**
 * Check if the current authenticated user has a specific permission.
 */
export async function hasPermission(permissionName: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // SuperAdmin has all permissions
  if (user.role === "SuperAdmin") return true;

  // Guests are restricted to read permissions.
  if (user.role === "Guest") {
    if (permissionName.includes(":write") || permissionName.includes(":approve") || permissionName.includes(":publish")) {
      return false;
    }
  }

  // Get user details from DB to find customRoleId
  const dbUser = await dbSubdomainStorage.run(user.subdomain, async () =>
    await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    })
  );

  if (!dbUser) return false;

  let targetRoleId = dbUser.customRoleId;

  // If no custom role is assigned, find the default system role for this tenant matching the user's role name
  if (!targetRoleId) {
    const defaultRole = await dbSubdomainStorage.run(user.subdomain, async () =>
      await db.query.roles.findFirst({
        where: and(
          eq(roles.tenantId, user.tenantId),
          eq(roles.name, user.role)
        ),
      })
    );
    if (!defaultRole) return false;
    targetRoleId = defaultRole.id;
  }

  // Query permissions linked to this role
  const hasPerm = await dbSubdomainStorage.run(user.subdomain, async () => {
    const matches = await db
      .select()
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(rolePermissions.roleId, targetRoleId),
          eq(permissions.name, permissionName)
        )
      );
    return matches.length > 0;
  });

  return hasPerm;
}

/**
 * Require a specific permission for the authenticated user, or throw an error.
 */
export async function requirePermission(permissionName: string): Promise<UserTokenPayload> {
  const user = await requireAuth();
  
  const permitted = await hasPermission(permissionName);
  if (!permitted) {
    throw new Error(`FORBIDDEN: User does not have the required permission '${permissionName}'.`);
  }

  return user;
}

/**
 * Ensures the authenticated user is not a Guest before proceeding with database mutations.
 */
export function verifyWriteAccess(user: { role: string }) {
  if (user.role === "Guest") {
    throw new Error("ACCESS_DENIED: Modifications are disabled in Guest view-only sandbox mode.");
  }
}

