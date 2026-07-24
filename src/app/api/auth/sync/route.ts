import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const token = url.searchParams.get("token");
  const refreshToken = url.searchParams.get("refresh");
  const returnTo = url.searchParams.get("returnTo") || "/";

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Determine current host to sync cookies on
  const hostname = request.headers.get("host") || "";
  const cleanHost = hostname.split(":")[0];
  
  // Resolve canonical subdomain for cookie sync
  let subdomain = "";
  const parts = cleanHost.split(".");
  if (cleanHost.endsWith(".localhost") || cleanHost.includes("localhost")) {
    if (parts.length > 1) subdomain = parts[0];
  } else {
    const isVercel = cleanHost.endsWith(".vercel.app");
    if (isVercel) {
      if (parts.length > 3) subdomain = parts[0];
    } else if (parts.length > 2) {
      subdomain = parts[0];
    }
  }

  // Set the HttpOnly cookies for the active domain using next/headers cookies()
  const cookieStore = await cookies();

  // Set session checked marker to prevent reload loops
  cookieStore.set("session_checked", "true", {
    path: "/",
  });

  cookieStore.set("access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 mins
    path: "/",
  });

  if (refreshToken) {
    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });
  }

  if (subdomain) {
    cookieStore.set("x-tenant-subdomain", subdomain, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.nextUrl.protocol || "http:";
  const redirectUrl = `${protocol}//${host}${returnTo}`;

  return NextResponse.redirect(new URL(redirectUrl));
}
