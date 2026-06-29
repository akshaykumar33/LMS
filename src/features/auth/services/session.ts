import { cookies } from "next/headers";
import { verifyAccessToken, UserTokenPayload } from "./jwt";

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

    return verifyAccessToken(token);
  } catch (error) {
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
    throw new Error("UNAUTHORIZED: User session is missing or expired.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role) && user.role !== "Guest" && user.role !== "SuperAdmin") {
    throw new Error(`FORBIDDEN: User role '${user.role}' is not authorized to access this resource.`);
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
