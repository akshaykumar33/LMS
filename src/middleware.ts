import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // Parse subdomain
  const cleanHost = hostname.split(":")[0];
  const parts = cleanHost.split(".");
  let subdomain = "";

  if (cleanHost.endsWith(".localhost") || cleanHost.includes("localhost")) {
    if (parts.length > 1) {
      subdomain = parts[0];
    }
  } else {
    const isVercel = cleanHost.endsWith(".vercel.app");
    if (isVercel) {
      if (parts.length > 4) {
        subdomain = parts[0];
      } else if (parts.length > 3) {
        subdomain = parts[0];
      }
    } else {
      if (parts.length > 2) {
        subdomain = parts[0];
      }
    }
  }

  // If subdomain is localhost or www, clear it to allow fallbacks
  if (subdomain === "localhost" || subdomain === "www") {
    subdomain = "";
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

  // Normalize empty subdomain to "intel" as the default tenant
  if (!subdomain) {
    subdomain = "intel";
  }

  // Always set the header so getTenantContext() can distinguish root domain (empty) from missing header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-subdomain", subdomain);

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

  // Never redirect server action requests — they use POST with a special header
  // and expect a serialized response, not a 302 redirect
  const isServerAction = request.method === "POST" && request.headers.has("Next-Action");

  // Authentication guards
  if (!isStaticRoute && !isAuthRoute && !isAdmissionApplyRoute && !isServerAction) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      // Retain the intended URL for redirection after login
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      response = NextResponse.redirect(loginUrl);
    }
  }

  // If logged in and hitting login page via navigation (not a server action POST), redirect to root
  if (isAuthRoute && accessToken && !isServerAction) {
    response = NextResponse.redirect(new URL("/", request.url));
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
  } else if ((url.pathname === "/" || url.pathname === "/login") && !querySubdomain && request.cookies.has("x-tenant-subdomain") && !subdomain) {
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
