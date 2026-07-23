import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const targetSubdomain = url.searchParams.get("subdomain");
  const returnTo = url.searchParams.get("returnTo") || "/";

  if (!targetSubdomain) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  const hostname = request.headers.get("host") || "localhost:3000";
  const port = hostname.split(":")[1] || "";
  const portSuffix = port ? `:${port}` : "";
  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isVercel = hostname.endsWith(".vercel.app");

  let redirectUrl = "";

  if (token) {
    // Session exists on parent VT domain, redirect to sync endpoint on target subdomain
    redirectUrl = isLocal
      ? `http://${targetSubdomain}.localhost${portSuffix}/api/auth/sync?token=${token}&refresh=${refreshToken || ""}&returnTo=${returnTo}`
      : isVercel
      ? `/api/auth/sync?token=${token}&refresh=${refreshToken || ""}&returnTo=${returnTo}`
      : `https://${targetSubdomain}.${hostname.replace(/^[^.]+\./, "")}/api/auth/sync?token=${token}&refresh=${refreshToken || ""}&returnTo=${returnTo}`;
  } else {
    // No session exists on parent VT domain, return to target subdomain homepage with check flag set
    const fallbackPath = `${returnTo}${returnTo.includes("?") ? "&" : "?"}checked=true`;
    redirectUrl = isLocal
      ? `http://${targetSubdomain}.localhost${portSuffix}${fallbackPath}`
      : isVercel
      ? fallbackPath
      : `https://${targetSubdomain}.${hostname.replace(/^[^.]+\./, "")}${fallbackPath}`;
  }

  const response = NextResponse.redirect(redirectUrl);
  return response;
}
