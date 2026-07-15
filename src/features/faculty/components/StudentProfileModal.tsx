"use client";

import React, { useState, useEffect } from "react";
import { X, Mail, Hash, Layers, Trophy, CheckCircle, XCircle, Briefcase, GraduationCap, Calendar, Loader2 } from "lucide-react";
import { getStudentProfileStatsAction } from "../actions/faculty-actions";
import { formatDate } from "@/utils/date-formatter";

interface StudentProfileModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

export function StudentProfileModal({ studentId, isOpen, onClose, primaryColor }: StudentProfileModalProps) {
  const brandColor = primaryColor || "#0ea5e9";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!studentId || !isOpen) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getStudentProfileStatsAction(studentId);
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to load student profile details.");
        }
      } catch (err) {
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [studentId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow decoration */}
        <div 
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20"
          style={{ backgroundColor: brandColor }}
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4 shrink-0">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-foreground">Academic Audit Console</h3>
            <p className="text-[10px] text-muted-foreground">Comprehensive student profile & course metrics.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 text-xs leading-relaxed">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" style={{ color: brandColor }} />
              <span className="text-[10px] text-muted-foreground font-semibold">Loading student profile...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-center">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-secondary/10 p-4 border border-border/50 rounded-2xl">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-md shrink-0"
                  style={{ backgroundColor: brandColor }}
                >
                  {data.student.user.firstName[0]}{data.student.user.lastName[0]}
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-black text-foreground">{data.student.user.firstName} {data.student.user.lastName}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {data.student.user.email}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="w-3.5 h-3.5" /> {data.student.rollNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Column details: General & Academic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* General Info */}
                <div className="border border-border/60 rounded-xl p-4 space-y-3 bg-card">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Enrolled Status
                  </h5>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Assigned Batch</span>
                      <span className="font-extrabold text-foreground">{data.student.batch?.name || "General Batch"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Admission Number</span>
                      <span className="font-mono font-semibold text-foreground">{data.student.admissionNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Academic History */}
                <div className="border border-border/60 rounded-xl p-4 space-y-3 bg-card">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> Background Credentials
                  </h5>
                  {data.academicHistory ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Degree</span>
                          <span className="font-semibold text-foreground truncate block" title={data.academicHistory.highestDegree}>
                            {data.academicHistory.highestDegree}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block">GPA / CGPA</span>
                          <span className="font-semibold text-foreground">{data.academicHistory.gpaOrPercentage}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Institution</span>
                          <span className="font-semibold text-foreground truncate block" title={data.academicHistory.institution}>
                            {data.academicHistory.institution}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Experience</span>
                          <span className="font-semibold text-foreground">{data.academicHistory.experienceMonths} months</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">No prior academic history logged.</p>
                  )}
                </div>
              </div>

              {/* Quiz Attempts */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" style={{ color: brandColor }} /> Academic Performance & Quiz Metrics
                </h5>
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    {data.attempts && data.attempts.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-secondary/40 border-b border-border/60 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                            <th className="p-3">Quiz Name</th>
                            <th className="p-3">Score</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-right">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {data.attempts.map((att: any) => (
                            <tr key={att.id} className="hover:bg-secondary/15 transition-colors">
                              <td className="p-3 font-semibold text-foreground">{att.quiz.title}</td>
                              <td className="p-3 font-mono font-bold">{att.score}%</td>
                              <td className="p-3 text-center">
                                {att.passed ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                                    <CheckCircle className="w-3 h-3" /> Pass
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-[9px] font-black uppercase">
                                    <XCircle className="w-3 h-3" /> Fail
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right text-[10px] text-muted-foreground">
                                {formatDate(att.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground italic">
                        No quiz attempts recorded in this academy.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SCORM Compliance Telemetry */}
              {data.scormTelemetry && data.scormTelemetry.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" style={{ color: brandColor }} /> SCORM E-Learning Telemetry
                  </h5>
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-secondary/40 border-b border-border/60 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                            <th className="p-3">Module</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Score</th>
                            <th className="p-3 text-center">Time</th>
                            <th className="p-3 text-right">Bookmark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {data.scormTelemetry.map((s: any, idx: number) => (
                            <tr key={idx} className="hover:bg-secondary/15 transition-colors">
                              <td className="p-3 font-semibold text-foreground">
                                <div>{s.lessonTitle}</div>
                                {s.courseName && <div className="text-[9px] text-muted-foreground">{s.courseName}</div>}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                  s.completed
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold">{s.score ?? "—"}</td>
                              <td className="p-3 text-center font-mono text-muted-foreground">
                                {s.timeSpentSeconds > 0
                                  ? `${Math.floor(s.timeSpentSeconds / 60)}m ${s.timeSpentSeconds % 60}s`
                                  : "—"}
                              </td>
                              <td className="p-3 text-right font-mono text-[10px] text-muted-foreground">{s.bookmark || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground italic">No data loaded.</div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 pt-4 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all cursor-pointer"
          >
            Close Profile Audit
          </button>
        </div>
      </div>
    </div>
  );
}
