import { NextResponse } from "next/server";
import { db } from "@/db/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantsList = await db.query.tenants.findMany();
    return NextResponse.json({ success: true, count: tenantsList.length, tenantsList });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || String(error),
      stack: error.stack,
      nodeVersion: process.version,
      env: {
        USE_JSON_DB: process.env.USE_JSON_DB,
        VERCEL: process.env.VERCEL,
      }
    }, { status: 500 });
  }
}
