import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // Parse subdomain
  // dev: subdomain.localhost:3000 -> parts: ['subdomain', 'localhost:3000']
  // prod: subdomain.domain.com -> parts: ['subdomain', 'domain', 'com']
  const parts = hostname.split(".");
  let subdomain = "";

  if (process.env.NODE_ENV === "development") {
    if (parts.length > 1 && !parts[parts.length - 2].includes("localhost")) {
      subdomain = parts[0];
    }
  } else {
    if (parts.length > 2) {
      subdomain = parts[0];
    }
  }

  // Fallback to query parameter or custom header if available (useful for API testing)
  const querySubdomain = url.searchParams.get("tenant");
  if (querySubdomain) {
    subdomain = querySubdomain;
  }

  const headerSubdomain = request.headers.get("x-tenant-subdomain");
  if (headerSubdomain) {
    subdomain = headerSubdomain;
  }

  // Set the headers
  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set("x-tenant-subdomain", subdomain);
  }

  // Define route protections
  const isAuthRoute =
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register") ||
    url.pathname.startsWith("/signup") ||
    url.pathname.startsWith("/forgot-password") ||
    url.pathname.startsWith("/reset-password");

  const isAdmissionApplyRoute = 
    url.pathname.startsWith("/admission/apply") || 
    url.pathname.startsWith("/checkout") ||
    url.pathname.startsWith("/verify");

  const isStaticRoute =
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes(".") || // static assets like images, icons
    url.pathname === "/";

  // Check auth cookies
  const accessToken = request.cookies.get("access_token")?.value;

  // Authentication guards
  if (!isStaticRoute && !isAuthRoute && !isAdmissionApplyRoute) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      // Retain the intended URL for redirection after login
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If logged in and hitting login page, redirect to dashboard
  if (isAuthRoute && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Return the modified response
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
