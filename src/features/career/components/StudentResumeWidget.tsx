"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  uploadStudentResumeAction,
  removeStudentResumeAction,
} from "../actions/career-actions";
import {
  FileText, UploadCloud, X, Eye, Download, RefreshCw,
  Check, Loader2, AlertCircle, FileCheck2,
} from "lucide-react";

interface StudentResumeWidgetProps {
  initialResumeUrl: string | null;
  primaryColor?: string;
}

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/** Extract a human-readable filename from a stored path like /uploads/resumes/<id>-<ts>.pdf */
function extractFileName(url: string): string {
  try {
    return decodeURIComponent(url.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

function friendlySize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentResumeWidget({
  initialResumeUrl,
  primaryColor = "#0ea5e9",
}: StudentResumeWidgetProps) {
  const [resumeUrl, setResumeUrl] = useState<string | null>(initialResumeUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const showMsg = (
    type: "success" | "error",
    text: string,
    autoDismiss = true
  ) => {
    setMessage({ type, text });
    if (autoDismiss) setTimeout(() => setMessage(null), 4000);
  };

  // ── Client-side pre-validation (fast feedback before server round-trip) ──
  const validateFile = (file: File): string | null => {
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    const mimeOk = ALLOWED_MIME.includes(file.type);
    const extOk = ALLOWED_EXTENSIONS.includes(ext);
    if (!mimeOk && !extOk)
      return "Invalid file type. Please upload a PDF, DOC, or DOCX file.";
    if (file.size > MAX_SIZE_BYTES)
      return `File too large (${friendlySize(file.size)}). Maximum size is ${MAX_SIZE_MB} MB.`;
    return null;
  };

  // ── Upload handler — calls server action directly via FormData ────────────
  const handleUpload = useCallback(async (file: File) => {
    const clientError = validateFile(file);
    if (clientError) {
      showMsg("error", clientError, false);
      return;
    }

    setMessage(null);
    setSelectedFileName(file.name);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await uploadStudentResumeAction(formData);

    setUploading(false);

    if (!res.success) {
      showMsg("error", res.error ?? "Upload failed. Please try again.", false);
      setSelectedFileName(null);
      return;
    }

    setResumeUrl(res.url ?? null);
    showMsg("success", "Resume uploaded successfully!");
  }, []);

  // ── Remove handler — calls server action directly ─────────────────────────
  const handleRemove = async () => {
    if (!confirm("Remove your uploaded resume? This cannot be undone.")) return;

    setRemoving(true);
    setMessage(null);

    const res = await removeStudentResumeAction();

    setRemoving(false);

    if (!res.success) {
      showMsg("error", res.error ?? "Failed to remove resume.", false);
      return;
    }

    setResumeUrl(null);
    setSelectedFileName(null);
    showMsg("success", "Resume removed.");
  };

  // ── Drag-and-drop handlers ────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset so the same file can be chosen again after Replace
    e.target.value = "";
  };

  // ── Derived display values ────────────────────────────────────────────────
  const displayName = resumeUrl ? extractFileName(resumeUrl) : null;

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Status message */}
      {message && (
        <div
          className={`flex items-start gap-2 text-[11px] font-semibold px-3 py-2 rounded-xl border ${
            message.type === "success"
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              : "text-red-400 bg-red-500/10 border-red-500/20"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          )}
          <span className="leading-normal">{message.text}</span>
        </div>
      )}

      {/* ── Uploading state ── */}
      {uploading && (
        <div className="border border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2.5 bg-secondary/10">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: primaryColor }}
          />
          <p className="text-xs font-bold text-foreground">
            Uploading{selectedFileName ? ` "${selectedFileName}"` : ""}…
          </p>
          <p className="text-[10px] text-muted-foreground">Please wait</p>
        </div>
      )}

      {/* ── Uploaded state ── */}
      {!uploading && resumeUrl && (
        <div className="bg-card border border-border rounded-xl p-3.5 space-y-3">
          {/* File info */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${primaryColor}18` }}
            >
              <FileCheck2 className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground">Resume on file</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 hover:bg-secondary/70 text-foreground transition-all"
            >
              <Eye className="w-3 h-3" /> View
            </a>
            <a
              href={resumeUrl}
              download={displayName}
              className="flex items-center justify-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 hover:bg-secondary/70 text-foreground transition-all"
            >
              <Download className="w-3 h-3" /> Download
            </a>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer hover:opacity-90"
              style={{
                borderColor: `${primaryColor}40`,
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              <RefreshCw className="w-3 h-3" /> Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center justify-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {removing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3 h-3" />
              )}
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      )}

      {/* ── Upload zone (no file yet) ── */}
      {!uploading && !resumeUrl && (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2.5 cursor-pointer transition-all select-none ${
              isDragging
                ? "border-primary/60 bg-primary/5 scale-[1.01]"
                : "border-border/60 bg-secondary/10 hover:border-primary/40 hover:bg-secondary/20"
            }`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}18` }}
            >
              <UploadCloud
                className="w-5 h-5"
                style={{ color: primaryColor }}
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-foreground">
                {isDragging ? "Drop your resume here" : "Upload your resume"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Drag & drop or{" "}
                <span style={{ color: primaryColor }} className="font-bold">
                  browse files
                </span>
                <br />
                PDF, DOC, DOCX · Max {MAX_SIZE_MB} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              Accepted: PDF, DOC, DOCX · Max {MAX_SIZE_MB} MB
            </p>
          </div>
        </>
      )}
    </div>
  );
}
