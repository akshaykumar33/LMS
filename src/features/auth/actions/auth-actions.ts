"use server";

import { cookies, headers } from "next/headers";
import { getTenantContext } from "../services/tenant";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/jwt";
import { db, dbSubdomainStorage } from "@/db/db";
import { users, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { isAncestorOf } from "../services/is-parent-tenant";

function getCookieDomain(host: string): string | undefined {
  const cleanHost = host.split(":")[0];
  if (!cleanHost) return undefined;
  
  if (cleanHost === "localhost" || cleanHost.endsWith(".localhost") || cleanHost === "127.0.0.1") {
    return undefined;
  }

  // Prevent browser from rejecting cookies on Vercel preview/production domains
  if (cleanHost.endsWith(".vercel.app")) {
    return undefined;
  }
  
  const parts = cleanHost.split(".");
  if (parts.length > 2) {
    return "." + parts.slice(-2).join(".");
  }
  return undefined;
}

/**
 * Server Action: Authenticate user credentials and establish session cookies.
 */
export async function loginAction(formData: any) {
  const tenant = await getTenantContext();
  const { email, password } = formData;
  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  try {
    // 1. Fetch user globally by email across all tenant subdomains
    let user: any = null;
    let foundSubdomain: string | null = null;
    
    const activeTenants = await db.query.tenants.findMany({
      where: eq(tenants.status, "active"),
    });
    const subdomains = activeTenants.map(t => t.subdomain);
    
    for (const sub of subdomains) {
      const u = await dbSubdomainStorage.run(sub, async () => 
        await db.query.users.findFirst({
          where: eq(users.email, email),
        })
      );
      if (u) {
        user = u;
        foundSubdomain = sub;
        break;
      }
    }

    if (!user) {
      return { success: false, error: "Invalid email or password." };
    }

    // Resolve user's actual home tenant subdomain using tenantId (fixes SQLite global scope query matching)
    if (user.tenantId) {
      const userTenant = activeTenants.find(t => t.id === user.tenantId);
      if (userTenant) {
        foundSubdomain = userTenant.subdomain;
      }
    }

    if (user.status !== "active") {
      return { success: false, error: `Account status is '${user.status}'. Please contact administration.` };
    }

    // 2. Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: "Invalid email or password." };
    }

    // 3. Root Portal Gate — Only SuperAdmin may login on the root/Wysbryx domain
    const isRootDomain = !tenant || tenant.subdomain === "wysbryx";
    if (isRootDomain && user.role !== "SuperAdmin") {
      return { 
        success: false, 
        error: "Access restricted. Only the Wysbryx Super Admin may log in on the root platform portal. Please use your organization's subdomain to sign in." 
      };
    }

    // 4. Cross-Tenant Ancestry/Hierarchy Gate — If logging in on a specific tenant subdomain,
    // verify the user belongs to this tenant OR their home tenant is an ancestor/descendant
    if (tenant && tenant.subdomain !== "wysbryx" && foundSubdomain) {
      const userTenant = activeTenants.find(t => t.subdomain === foundSubdomain);
      if (userTenant && userTenant.id !== tenant.id) {
        // User's home tenant is different from the login domain
        const isAncestor = await isAncestorOf(userTenant.id, tenant.id);
        const isDescendant = await isAncestorOf(tenant.id, userTenant.id);
        if (!isAncestor && !isDescendant && user.role !== "SuperAdmin") {
          return {
            success: false,
            error: `You are not authorized to access the ${tenant.name} portal.`
          };
        }
      }
    }

    // 5. Issue JWT access and refresh tokens
    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      subdomain: foundSubdomain || "public",
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 6. Save to HttpOnly cookies
    const cookieStore = await cookies();
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const cookieDomain = getCookieDomain(host);

    // Sync subdomain cookie to match user's registered tenant (supports cross-tenant sandbox logins)
    if (user.tenantId) {
      const userTenant = await dbSubdomainStorage.run(foundSubdomain || "public", async () =>
        await db.query.tenants.findFirst({
          where: eq(tenants.id, user.tenantId),
        })
      );
      if (userTenant) {
        cookieStore.set("x-tenant-subdomain", userTenant.subdomain, {
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    } else {
      cookieStore.delete("x-tenant-subdomain");
    }
    
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
      domain: cookieDomain,
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
      domain: cookieDomain,
    });

    return { success: true, role: user.role };
  } catch (error: any) {
    console.error("Login failure:", error);
    return { success: false, error: "Internal server error." };
  }
}

/**
 * Server Action: Clear cookies to terminate user session.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const cookieDomain = getCookieDomain(host);

  // Clear with cookie domain if present
  if (cookieDomain) {
    cookieStore.delete({
      name: "access_token",
      path: "/",
      domain: cookieDomain,
    });

    cookieStore.delete({
      name: "refresh_token",
      path: "/",
      domain: cookieDomain,
    });

    cookieStore.delete({
      name: "x-tenant-subdomain",
      path: "/",
      domain: cookieDomain,
    });
  }

  // Also clear host-only cookies (without domain option) to guarantee removal
  cookieStore.delete({
    name: "access_token",
    path: "/",
  });

  cookieStore.delete({
    name: "refresh_token",
    path: "/",
  });

  cookieStore.delete({
    name: "x-tenant-subdomain",
    path: "/",
  });

  return { success: true };
}

/**
 * Refresh Access Token using Refresh Token cookie.
 */
export async function refreshSessionAction() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;
    
    if (!refreshToken) {
      return { success: false, error: "No refresh token available." };
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return { success: false, error: "Invalid refresh token." };
    }

    const newAccessToken = signAccessToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      subdomain: payload.subdomain || "public",
      email: payload.email,
      role: payload.role,
    });

    const headersList = await headers();
    const host = headersList.get("host") || "";
    const cookieDomain = getCookieDomain(host);

    cookieStore.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
      domain: cookieDomain,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Session refresh failed." };
  }
}

/**
 * Server Action: Establish user session directly. Used for auto-login after signup/payment.
 */
export async function establishSessionAction(userId: string) {
  try {
    let user: any = null;
    let foundSub: string | null = null;
    const activeTenants = await db.query.tenants.findMany({
      where: eq(tenants.status, "active"),
    });
    const subdomains = activeTenants.map(t => t.subdomain);
    for (const sub of subdomains) {
      const u = await dbSubdomainStorage.run(sub, async () => 
        await db.query.users.findFirst({
          where: eq(users.id, userId),
        })
      );
      if (u) {
        user = u;
        foundSub = sub;
        break;
      }
    }
    if (!user) {
      return { success: false, error: "User not found." };
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      subdomain: foundSub || "public",
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const cookieStore = await cookies();
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const cookieDomain = getCookieDomain(host);

    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
      domain: cookieDomain,
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      domain: cookieDomain,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Direct session establishment failed:", error);
    return { success: false, error: "Authentication failed." };
  }
}
