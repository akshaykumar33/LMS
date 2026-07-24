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
  cookieStore.set("x-tenant-subdomain", targetSubdomain, { path: "/", maxAge: 60 * 60 * 24 * 30 });

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  return response;
}
