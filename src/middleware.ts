import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // Parse subdomain
  // dev: child.parent.localhost:3000 -> parts: ['child', 'parent', 'localhost:3000']
  // prod: child.parent.domain.com -> parts: ['child', 'parent', 'domain', 'com']
  const parts = hostname.split(".");
  let subdomain = "";

  if (process.env.NODE_ENV === "development") {
    if (parts.length > 2 && parts[parts.length - 1].includes("localhost")) {
      subdomain = parts[0]; // e.g. child subdomain
    } else if (parts.length > 1 && !parts[parts.length - 2].includes("localhost")) {
      subdomain = parts[0];
    }
  } else {
    const isVercel = hostname.endsWith(".vercel.app");
    if (isVercel) {
      if (parts.length > 4) {
        subdomain = parts[0];
      } else if (parts.length > 3) {
        subdomain = parts[0];
      }
    } else {
      if (parts.length > 3) {
        subdomain = parts[0];
      } else if (parts.length > 2) {
        subdomain = parts[0];
      }
    }
  }

  // Support nested path-based routing: /tenant/parent/sub/child/...
  if (url.pathname.startsWith("/tenant/")) {
    const pathParts = url.pathname.split("/");
    const subIdx = pathParts.indexOf("sub");
    if (subIdx !== -1 && pathParts[subIdx + 1]) {
      subdomain = pathParts[subIdx + 1];
    } else if (pathParts[2]) {
      subdomain = pathParts[2];
    }
  }

  // Fallback to query parameter or custom header if available
  const querySubdomain = url.searchParams.get("tenant");
  const headerSubdomain = request.headers.get("x-tenant-subdomain");

  if (querySubdomain) {
    subdomain = querySubdomain;
  } else if (headerSubdomain) {
    subdomain = headerSubdomain;
  } else if (!subdomain) {
    // Read from cookie if not on the root landing selection page
    const cookieSubdomain = request.cookies.get("x-tenant-subdomain")?.value;
    if (cookieSubdomain && url.pathname !== "/") {
      subdomain = cookieSubdomain;
    }
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

  let response: NextResponse | null = null;

  // Authentication guards
  if (!isStaticRoute && !isAuthRoute && !isAdmissionApplyRoute) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      // Retain the intended URL for redirection after login
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      response = NextResponse.redirect(loginUrl);
    }
  }

  // If logged in and hitting login page, redirect to dashboard
  if (isAuthRoute && accessToken) {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!response) {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Apply tenant cookie sync to the final response
  if (querySubdomain) {
    response.cookies.set("x-tenant-subdomain", querySubdomain, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  } else if (url.pathname === "/" && !querySubdomain && request.cookies.has("x-tenant-subdomain")) {
    response.cookies.delete("x-tenant-subdomain");
  }

  return response;
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
