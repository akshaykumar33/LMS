import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await request.arrayBuffer());
    
    // Save to public/uploads/[key]
    const uploadPath = path.join(process.cwd(), "public", "uploads", key);
    const dir = path.dirname(uploadPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(uploadPath, buffer);
    
    return NextResponse.json({ success: true, url: `/uploads/${key}` });
  } catch (error: any) {
    console.error("Mock upload failed:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
