import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL ERROR: JWT_SECRET environment variable is missing in PRODUCTION mode! Falling back to static key is insecure.");
  }
  return "super-secret-jwt-key-lms-coe-2026";
})();

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL ERROR: JWT_REFRESH_SECRET environment variable is missing in PRODUCTION mode! Falling back to static key is insecure.");
  }
  return "super-secret-jwt-refresh-key-lms-coe-2026";
})();

export interface UserTokenPayload {
  userId: string;
  tenantId: string;
  subdomain: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as UserTokenPayload;
  } catch (error) {
    return null;
  }
}
