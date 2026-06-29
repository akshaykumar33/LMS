"use server";

import { cookies, headers } from "next/headers";
import { getTenantContext } from "../services/tenant";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/jwt";
import { db } from "@/db/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

function getCookieDomain(host: string): string | undefined {
  const cleanHost = host.split(":")[0];
  if (!cleanHost) return undefined;
  
  if (cleanHost === "localhost" || cleanHost.endsWith(".localhost") || cleanHost === "127.0.0.1") {
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
    let user;
    if (!tenant) {
      // 1. Fetch user globally (on root domain)
      user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (user && user.role !== "SuperAdmin") {
        return { 
          success: false, 
          error: "Access denied. Please access your academy's subdomain to log in." 
        };
      }
    } else {
      // 1. Fetch user by tenant & email
      user = await db.query.users.findFirst({
        where: and(
          eq(users.tenantId, tenant.id),
          eq(users.email, email)
        ),
      });

      // Fallback: Check if this is a global SuperAdmin logging in via a tenant domain
      if (!user) {
        const globalUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (globalUser && globalUser.role === "SuperAdmin") {
          user = globalUser;
        }
      }
    }

    if (!user) {
      return { success: false, error: "Invalid email or password." };
    }

    if (user.status !== "active") {
      return { success: false, error: `Account status is '${user.status}'. Please contact administration.` };
    }

    // 2. Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: "Invalid email or password." };
    }

    // 3. Issue JWT access and refresh tokens
    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 4. Save to HttpOnly cookies
    const cookieStore = await cookies();
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const cookieDomain = getCookieDomain(host);
    
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
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      return { success: false, error: "User not found." };
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
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
