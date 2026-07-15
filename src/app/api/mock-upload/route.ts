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
    const isZip = key.toLowerCase().endsWith(".zip");

    if (isZip) {
      // Extract SCORM zip package and find the launch file
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip(buffer);

      // Create a unique directory for the extracted content
      const scormKey = key.replace(/\.zip$/i, "").replace(/[^a-zA-Z0-9_\-\/]/g, "_");
      const extractDir = path.join(process.cwd(), "public", "uploads", "scorm", scormKey);

      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
      fs.mkdirSync(extractDir, { recursive: true });

      zip.extractAllTo(extractDir, true);

      // Find the launch file
      const launchFile = findLaunchFile(extractDir);

      if (!launchFile) {
        return NextResponse.json(
          { error: "Could not find a valid launch file in the SCORM package." },
          { status: 400 }
        );
      }

      // Build the public URL path
      const relativeLaunch = path.relative(
        path.join(process.cwd(), "public"),
        launchFile
      ).replace(/\\/g, "/");

      return NextResponse.json({
        success: true,
        url: `/${relativeLaunch}`,
        scorm: true,
      });
    }

    // Non-zip: save file normally
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

/**
 * Locate the SCORM launch file inside the extracted directory.
 * Priority: imsmanifest.xml resource href > known fallback filenames.
 */
function findLaunchFile(extractDir: string): string | null {
  // 1. Try parsing imsmanifest.xml
  const manifestPath = findFileRecursive(extractDir, "imsmanifest.xml");
  if (manifestPath) {
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    // Extract the first resource href from the manifest
    const hrefMatch = manifestContent.match(/<resource[^>]*\shref=["']([^"']+)["']/i);
    if (hrefMatch) {
      const candidatePath = path.resolve(path.dirname(manifestPath), hrefMatch[1]);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }

  // 2. Fallback: search for common entry filenames
  const fallbacks = ["index_lms.html", "story.html", "index.html", "player.html", "launch.html"];
  for (const name of fallbacks) {
    const found = findFileRecursive(extractDir, name);
    if (found) return found;
  }

  return null;
}

/**
 * Recursively search for a file by name inside a directory.
 */
function findFileRecursive(dir: string, filename: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Check current directory first
  for (const entry of entries) {
    if (!entry.isDirectory() && entry.name.toLowerCase() === filename.toLowerCase()) {
      return path.join(dir, entry.name);
    }
  }

  // Recurse into subdirectories
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const found = findFileRecursive(path.join(dir, entry.name), filename);
      if (found) return found;
    }
  }

  return null;
}
