"use client";

import React, { useState } from "react";
import { updateStudentResumeAction } from "../actions/career-actions";
import { FileText, Edit3, Check, Loader2, ArrowRight } from "lucide-react";

interface StudentResumeWidgetProps {
  initialResumeUrl: string | null;
  primaryColor?: string;
}

export function StudentResumeWidget({ initialResumeUrl, primaryColor = "#0ea5e9" }: StudentResumeWidgetProps) {
  const [resumeUrl, setResumeUrl] = useState(initialResumeUrl || "");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await updateStudentResumeAction(resumeUrl);
    setLoading(false);

    if (res.success) {
      setMessage({ type: "success", text: "Resume link updated successfully." });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to save link." });
    }
  };

  return (
    <div className="bg-surface border border-border p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary" /> Placement Resume Link
        </span>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-bold hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            style={{ color: primaryColor }}
          >
            <Edit3 className="w-3 h-3" /> {resumeUrl ? "Change Link" : "Add Resume"}
          </button>
        )}
      </div>

      {message && (
        <p
          className={`text-xs font-semibold flex items-center gap-1 ${
            message.type === "success" ? "text-emerald-400" : "text-destructive"
          }`}
        >
          {message.type === "success" && <Check className="w-3.5 h-3.5" />} {message.text}
        </p>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            required
            placeholder="https://drive.google.com/..."
            value={resumeUrl}
            onChange={(e) => setResumeUrl(e.target.value)}
            className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setResumeUrl(initialResumeUrl || "");
                setIsEditing(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-xs font-bold text-white px-4 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                </>
              ) : (
                "Save Link"
              )}
            </button>
          </div>
        </form>
      ) : (
        <div>
          {resumeUrl ? (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold hover:underline break-all"
              style={{ color: primaryColor }}
            >
              View current resume <ArrowRight className="w-3.5 h-3.5" />
            </a>
          ) : (
            <p className="text-xs text-muted-foreground italic">No resume URL provided. Add one to apply for jobs!</p>
          )}
        </div>
      )}
    </div>
  );
}
