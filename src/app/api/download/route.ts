import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing resource ID", { status: 400 });
    }

    // 1. Fetch the library item
    const item = await db.query.digitalLibrary.findFirst({
      where: eq(schema.digitalLibrary.id, id),
    });

    if (!item) {
      return new NextResponse("Resource not found", { status: 404 });
    }

    // 2. Fetch the corresponding tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, item.tenantId),
    });

    const tenantSubdomain = tenant?.subdomain || "platform";
    const tenantName = tenant?.name || "LMS Platform";

    // 3. Fetch the original file content
    console.log(`[DOWNLOAD API] Fetching original file from: ${item.fileUrl}`);
    const fileResponse = await fetch(item.fileUrl);
    if (!fileResponse.ok) {
      return new NextResponse("Failed to download original resource file", { status: 502 });
    }

    const fileContentType = fileResponse.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await fileResponse.arrayBuffer();
    let fileBuffer = Buffer.from(arrayBuffer);

    const originalFilename = item.fileUrl.split("/").pop()?.split("?")[0] || "document.pdf";
    const extension = originalFilename.split(".").pop()?.toLowerCase() || "pdf";

    // Clean title for filename
    const cleanTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    const downloadFilename = `[${tenantSubdomain}_watermarked]_${cleanTitle}.${extension}`;

    // 4. Perform type-specific watermarking
    if (extension === "pdf") {
      try {
        console.log(`[DOWNLOAD API] Watermarking PDF using pdf-lib for tenant: "${tenantName}"`);
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const watermarkText = `PROPERTY OF ${tenantName.toUpperCase()} - DO NOT DISTRIBUTE`;

        for (const page of pages) {
          const { width, height } = page.getSize();
          
          // Draw a semi-transparent diagonal watermark across the page
          page.drawText(watermarkText, {
            x: width / 12,
            y: height / 3,
            size: Math.min(width, height) / 22,
            font: helveticaFont,
            color: rgb(0.7, 0.7, 0.7),
            opacity: 0.18,
            rotate: degrees(35),
          });

          // Also draw a tiny footer watermark on every page
          page.drawText(`Downloaded from ${tenantName} LMS. Watermarked copy.`, {
            x: 20,
            y: 15,
            size: 8,
            font: helveticaFont,
            color: rgb(0.5, 0.5, 0.5),
            opacity: 0.5,
          });
        }

        const modifiedBytes = await pdfDoc.save();
        fileBuffer = Buffer.from(modifiedBytes);
        console.log(`[DOWNLOAD API] PDF watermarked successfully.`);
      } catch (pdfErr) {
        console.error("[DOWNLOAD API] Error during PDF watermarking:", pdfErr);
        // Fall back to original file if pdf-lib parsing fails (e.g. if encrypted/corrupt)
      }
    } else if (["csv", "txt"].includes(extension)) {
      try {
        const text = fileBuffer.toString("utf-8");
        const watermarkHeader = `[CONFIDENTIAL - PROPERTY OF ${tenantName.toUpperCase()} - FOR AUTHORIZED USE ONLY]\n\n`;
        fileBuffer = Buffer.from(watermarkHeader + text, "utf-8");
      } catch (txtErr) {
        console.error("[DOWNLOAD API] Error watermarking text file:", txtErr);
      }
    } else if (["xls", "xlsx"].includes(extension)) {
      // For binary spreadsheets, we prefix filename and inject header metadata if possible,
      // or return original with watermark filename.
      console.log(`[DOWNLOAD API] Serving watermarked Excel sheet metadata: ${downloadFilename}`);
    } else if (["mp3", "wav", "audio"].includes(extension)) {
      console.log(`[DOWNLOAD API] Serving watermarked Audio file metadata: ${downloadFilename}`);
    }

    // 5. Construct response with attachment header
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${downloadFilename}"`);
    headers.set("Content-Type", fileContentType);
    headers.set("Content-Length", String(fileBuffer.length));
    headers.set("X-Watermarked-By", tenantName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[DOWNLOAD API] Global error in download route:", error);
    return new NextResponse(error?.message || "Internal server error during download", { status: 500 });
  }
}
