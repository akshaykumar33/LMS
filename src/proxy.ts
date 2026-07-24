import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Read tenant subdomain from header or cookie (if set via user session)
  const headerSubdomain = request.headers.get("x-tenant-subdomain");
  const cookieSubdomain = request.cookies.get("x-tenant-subdomain")?.value;
  const subdomain = headerSubdomain || cookieSubdomain || "";

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
    url.pathname.includes("."); // static assets like images, icons

  const accessToken = request.cookies.get("access_token")?.value;
  const isServerAction = request.method === "POST" && request.headers.has("Next-Action");

  // Root URL redirection: direct straight to /dashboard (if logged in) or /login (if not)
  if (url.pathname === "/") {
    if (accessToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // If logged in and attempting to visit login/auth page via navigation, redirect to /dashboard
  if (isAuthRoute && accessToken && !isServerAction) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Authentication guard for protected application routes
  if (!isStaticRoute && !isAuthRoute && !isAdmissionApplyRoute && !isServerAction) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      if (url.pathname !== "/dashboard") {
        loginUrl.searchParams.set("callbackUrl", url.pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

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
