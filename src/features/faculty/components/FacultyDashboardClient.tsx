"use client";

import React, { useEffect } from "react";
import { useFacultyStore } from "@/store";
import { StudentProfileModal } from "./StudentProfileModal";
import { ScheduleClassForm } from "./ScheduleClassForm";
import { FacultyQuickConfigForm } from "./FacultyQuickConfigForm";
import { gradeProjectSubmissionAction } from "../actions/faculty-actions";
import { gradeSubjectiveAction } from "@/features/course/actions/subjective-actions";
import { formatDate, formatReadableDate } from "@/utils/date-formatter";
import {
  Search,
  Users,
  Video,
  Layers,
  Trophy,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  ShieldAlert,
  Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FacultyDashboardClientProps {
  roster: any[];
  recentAttempts: any[];
  batchesList: any[];
  selectedBatchId: string;
  primaryColor: string;
  courses: any[];
  projectSubmissions?: any[];
  capstoneProjects?: any[];
  subjectiveSubmissions?: any[];
  batchSessions?: any[];
  userRole?: string;
  enableProctoring?: boolean;
}

export function FacultyDashboardClient({
  roster,
  recentAttempts,
  batchesList,
  selectedBatchId,
  primaryColor,
  courses,
  projectSubmissions = [],
  capstoneProjects = [],
  subjectiveSubmissions = [],
  batchSessions = [],
  userRole,
  enableProctoring = false,
}: FacultyDashboardClientProps) {
  const {
    activeTab, setActiveTab,
    selectedStudentId, isModalOpen, openStudentModal, closeStudentModal,
    submissionsList, setSubmissionsList,
    selectedSubmission, openGradeModal, closeGradeModal, applyGrade,
    gradeStatus, setGradeStatus,
    gradeScore, setGradeScore,
    gradeFeedback, setGradeFeedback,
    isGradingSubmitting, setIsGradingSubmitting,
    gradingMessage, setGradingMessage,
    rosterSearch, setRosterSearch,
    attemptsSearch, setAttemptsSearch,
    proctorAttempts, clearProctorAttempt,
    selectedProctorAttempt, openProctorAudit, closeProctorAudit,
    proctorSearchTerm, setProctorSearchTerm,
  } = useFacultyStore();

  // Seed submissions list from server props
  useEffect(() => {
    setSubmissionsList(projectSubmissions);
  }, [projectSubmissions, setSubmissionsList]);

  const [subSubmissions, setSubSubmissions] = React.useState<any[]>(subjectiveSubmissions);
  const [selectedSub, setSelectedSub] = React.useState<any | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = React.useState(false);
  const [subGradeScore, setSubGradeScore] = React.useState(0);
  const [subGradeFeedback, setSubGradeFeedback] = React.useState("");
  const [subRubrics, setSubRubrics] = React.useState<any[]>([
    { criteria: "Technical Correctness", score: 0, maxScore: 40, feedback: "" },
    { criteria: "Clarity & Structure", score: 0, maxScore: 30, feedback: "" },
    { criteria: "Completeness", score: 0, maxScore: 30, feedback: "" }
  ]);
  const [isSubGradingSubmitting, setIsSubGradingSubmitting] = React.useState(false);
  const [subGradingMessage, setSubGradingMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [subSearch, setSubSearch] = React.useState("");

  useEffect(() => {
    setSubSubmissions(subjectiveSubmissions);
  }, [subjectiveSubmissions]);

  // Local states for scheduling batch sessions
  const [localSessions, setLocalSessions] = React.useState<any[]>(batchSessions);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);
  const [scheduleBatchId, setScheduleBatchId] = React.useState(selectedBatchId || (batchesList[0]?.id || ""));
  const [scheduleTitle, setScheduleTitle] = React.useState("");
  const [scheduleDesc, setScheduleDesc] = React.useState("");
  const [scheduleStartTime, setScheduleStartTime] = React.useState("");
  const [scheduleEndTime, setScheduleEndTime] = React.useState("");
  const [scheduleMeetingUrl, setScheduleMeetingUrl] = React.useState("https://zoom.us");
  const [isScheduling, setIsScheduling] = React.useState(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);

  useEffect(() => {
    setLocalSessions(batchSessions);
  }, [batchSessions]);

  // Sync active tab from URL query param on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const validTabs = ["overview", "roster", "schedule", "curriculum", "submissions", "subjective"];
    if (enableProctoring) validTabs.push("proctoring");
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const filteredRoster = roster.filter((s) => {
    const fullName = `${s.firstName} ${s.lastName || ""}`.toLowerCase();
    const q = rosterSearch.toLowerCase();
    return fullName.includes(q) || s.rollNumber.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const filteredAttempts = recentAttempts.filter((a) => {
    const q = attemptsSearch.toLowerCase();
    return a.studentName.toLowerCase().includes(q) || a.quizTitle.toLowerCase().includes(q);
  });

  const averageGrade =
    recentAttempts.length > 0
      ? Math.round(recentAttempts.reduce((acc, a) => acc + a.score, 0) / recentAttempts.length)
      : 85;

  const liveSessions = courses.flatMap((c) =>
    (c.modules || []).flatMap((m: any) =>
      (m.lessons || []).filter(
        (l: any) => l.contentType === "live_class" || l.name?.toLowerCase().includes("zoom") || l.name?.toLowerCase().includes("live")
      )
    )
  );

  // ── Grade submission handler ────────────────────────────────────────────────
  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    setIsGradingSubmitting(true);
    setGradingMessage(null);

    const res = await gradeProjectSubmissionAction(selectedSubmission.id, {
      status: gradeStatus,
      score: gradeScore,
      feedback: gradeFeedback,
    });

    setIsGradingSubmitting(false);
    if (res.success) {
      setGradingMessage({ type: "success", text: "Project evaluation submitted successfully!" });
      applyGrade(selectedSubmission.id, gradeStatus, gradeScore, gradeFeedback);
      setTimeout(() => {
        closeGradeModal();
      }, 1200);
    } else {
      setGradingMessage({ type: "error", text: res.error || "Failed to submit evaluation." });
    }
  };

  const filteredSubmissions = subSubmissions.filter((s) => {
    const fullName = `${s.student?.user?.firstName || ""} ${s.student?.user?.lastName || ""}`.toLowerCase();
    const q = subSearch.toLowerCase();
    return fullName.includes(q) || s.title.toLowerCase().includes(q) || s.course?.name.toLowerCase().includes(q);
  });

  const openSubGradeModal = (sub: any) => {
    setSelectedSub(sub);
    setSubGradeScore(sub.score || 0);
    setSubGradeFeedback(sub.feedback || "");
    if (sub.rubrics && sub.rubrics.length > 0) {
      setSubRubrics(sub.rubrics);
    } else {
      setSubRubrics([
        { criteria: "Technical Correctness", score: 0, maxScore: 40, feedback: "" },
        { criteria: "Clarity & Structure", score: 0, maxScore: 30, feedback: "" },
        { criteria: "Completeness", score: 0, maxScore: 30, feedback: "" }
      ]);
    }
    setSubGradingMessage(null);
    setIsSubModalOpen(true);
  };

  const closeSubGradeModal = () => {
    setIsSubModalOpen(false);
    setSelectedSub(null);
  };

  const handleSubGradeScoreChange = (index: number, val: number) => {
    const next = [...subRubrics];
    next[index].score = val;
    setSubRubrics(next);
    
    // Auto calculate overall score as sum of rubric scores
    const sum = next.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
    setSubGradeScore(sum);
  };

  const handleSubGradeFeedbackChange = (index: number, val: string) => {
    const next = [...subRubrics];
    next[index].feedback = val;
    setSubRubrics(next);
  };

  const handleSubGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setIsSubGradingSubmitting(true);
    setSubGradingMessage(null);

    const res = await gradeSubjectiveAction(selectedSub.id, {
      score: subGradeScore,
      feedback: subGradeFeedback,
      rubrics: subRubrics,
    });

    setIsSubGradingSubmitting(false);
    if (res.success) {
      setSubGradingMessage({ type: "success", text: "Subjective evaluation submitted successfully!" });
      
      // Update local state
      const updatedList = subSubmissions.map((s) => {
        if (s.id === selectedSub.id) {
          const historyEntry = {
            score: subGradeScore,
            feedback: subGradeFeedback,
            rubrics: subRubrics,
            evaluatedBy: userRole || "Faculty",
            evaluatedAt: new Date().toISOString(),
          };
          const updatedHistory = [...(s.history || []), historyEntry];
          return {
            ...s,
            score: subGradeScore,
            feedback: subGradeFeedback,
            rubrics: subRubrics,
            status: "graded",
            history: updatedHistory,
          };
        }
        return s;
      });
      setSubSubmissions(updatedList);

      setTimeout(() => {
        closeSubGradeModal();
      }, 1200);
    } else {
      setSubGradingMessage({ type: "error", text: res.error || "Failed to submit evaluation." });
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScheduling(true);
    setScheduleError(null);

    try {
      const { scheduleBatchSessionAction } = await import("../../course/actions/course-actions");
      const res = await scheduleBatchSessionAction(
        scheduleBatchId,
        scheduleTitle,
        scheduleDesc,
        new Date(scheduleStartTime),
        new Date(scheduleEndTime),
        scheduleMeetingUrl
      );

      if (res.success) {
        const targetBatch = batchesList.find(b => b.id === scheduleBatchId);
        const newSession = {
          id: Math.random().toString(),
          title: scheduleTitle,
          description: scheduleDesc,
          startTime: new Date(scheduleStartTime).toISOString(),
          endTime: new Date(scheduleEndTime).toISOString(),
          meetingUrl: scheduleMeetingUrl,
          batch: targetBatch ? { name: targetBatch.name } : null,
          instructor: { firstName: "You", lastName: "" },
        };
        setLocalSessions((prev) => [...prev, newSession]);

        setIsScheduleModalOpen(false);
        setScheduleTitle("");
        setScheduleDesc("");
        setScheduleStartTime("");
        setScheduleEndTime("");
      } else {
        setScheduleError(res.error || "Failed to schedule session.");
      }
    } catch (err: any) {
      setScheduleError(err.message || "Failed to schedule session.");
    } finally {
      setIsScheduling(false);
    }
  };

  const TABS = [
    { id: "overview", label: "Overview", icon: Trophy },
    { id: "roster", label: "Cohort Roster", icon: Users },
    { id: "submissions", label: "Capstone Projects", icon: Trophy },
    { id: "subjective", label: "Subjective Grading", icon: Edit3 },
    ...(enableProctoring ? [{ id: "proctoring", label: "Web Proctoring Audits", icon: ShieldAlert }] : []),
    { id: "schedule", label: "Live Classrooms", icon: Video },
    { id: "curriculum", label: "Curriculum Config", icon: Layers },
  ] as { id: string; label: string; icon: any }[];

  return (
    <div className="space-y-6">
      <StudentProfileModal
        studentId={selectedStudentId}
        isOpen={isModalOpen}
        onClose={closeStudentModal}
        primaryColor={primaryColor}
      />

      {/* Tab Bar */}
      <div className="flex border-b border-border/60 pb-px overflow-x-auto space-x-6 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", tab.id);
                  window.history.pushState({}, "", url.toString());
                }
              }}
              className={`flex items-center gap-2 pb-3.5 text-xs font-bold transition-all relative border-b-2 cursor-pointer shrink-0 ${isActive ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
              style={isActive ? { borderColor: primaryColor, color: primaryColor } : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="animate-in fade-in duration-300">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Cohort Performance Average", value: `${averageGrade}%`, sub: "Class evaluation passes are within margins.", icon: Trophy, color: "bg-primary/10 text-primary", subIcon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
                { label: "Active Class Attendance", value: "94.8%", sub: "Attendance streak is high this week.", icon: Users, color: "bg-emerald-500/10 text-emerald-400", subIcon: <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> },
                { label: "Sessions Next 7 Days", value: `${Math.max(liveSessions.length, 2)} Scheduled`, sub: "Virtual sync classes are operational.", icon: Video, color: "bg-indigo-500/10 text-indigo-400", subIcon: <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> },
              ].map((card) => (
                <div key={card.label} className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center ${card.color}`}><card.icon className="w-4 h-4" /></div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">{card.label}</span>
                  <p className="text-3xl font-black text-foreground">{card.value}</p>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">{card.subIcon}<span>{card.sub}</span></div>
                </div>
              ))}
            </div>

            <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Recent Quiz Submissions
                  </h3>
                  <p className="text-[9px] text-muted-foreground">Monitor real-time learner test metrics & progress scores.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input type="text" placeholder="Search by student or quiz..." value={attemptsSearch} onChange={(e) => setAttemptsSearch(e.target.value)} className="w-full h-8 pl-9 pr-3 text-xs bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:border-primary/50 text-foreground" />
                </div>
              </div>
              {filteredAttempts.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin border border-border/40 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-muted/10 text-muted-foreground border-b border-border text-[9px] font-black uppercase tracking-widest">
                        <th className="p-3.5">Student</th><th className="p-3.5">Quiz Details</th>
                        <th className="p-3.5 text-center">Score achieved</th><th className="p-3.5 text-center">Outcome</th>
                        <th className="p-3.5 text-right">Logs Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredAttempts.map((a) => (
                        <tr key={a.attemptId} className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 text-foreground font-bold">{a.studentName}</td>
                          <td className="p-3 text-foreground">
                            <span className="font-bold font-mono text-[9px] mr-2 bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded" style={{ color: primaryColor }}>{a.courseCode}</span>
                            {a.quizTitle}
                          </td>
                          <td className="p-3 text-center text-foreground font-extrabold">{a.score}%</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${a.passed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-red-500/10 text-red-400 border-red-500/25"}`}>
                              {a.passed ? "PASS" : "FAIL"}
                            </span>
                          </td>
                          <td className="p-3 text-right text-muted-foreground">{formatReadableDate(a.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/5 border border-border/40 rounded-xl text-muted-foreground text-xs font-semibold">No submissions match your search query filter.</div>
              )}
            </div>
          </div>
        )}

        {/* ── ROSTER ── */}
        {activeTab === "roster" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-4">
              <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4 shadow-sm border border-border/40">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Select Cohort Batch</h3>
                <div className="space-y-2">
                  {batchesList.length > 0 ? batchesList.map((b) => (
                    <a key={b.id} href={`/faculty?batchId=${b.id}&tab=roster`} className={`block p-3.5 rounded-xl border text-xs transition-all ${b.id === selectedBatchId ? "bg-primary/10 border-primary/30 text-foreground font-bold" : "bg-transparent border-border/50 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-xs text-foreground">{b.name}</span>
                        <div className="flex items-center gap-1.5">
                          {b.status && (
                            <span className={`inline-flex items-center text-[7.5px] font-black uppercase px-1 rounded border ${
                              b.status === "ongoing" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              b.status === "completed" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              b.status === "cancelled" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                              "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>
                              {b.status}
                            </span>
                          )}
                          <span className="text-[9px] font-bold bg-card border border-border px-1.5 py-0.5 rounded text-muted-foreground">{b.studentCount} Students</span>
                        </div>
                      </div>
                    </a>
                  )) : <p className="text-xs text-muted-foreground">No batches configured.</p>}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Cohort Learner Roster</h3>
                  <p className="text-[9px] text-muted-foreground">Trainees registered for selected batch.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                    <input type="text" placeholder="Search roster..." value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} className="w-full h-8 pl-9 pr-3 text-xs bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:border-primary/50 text-foreground" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono font-bold bg-primary/5 text-primary border border-primary/20 shrink-0">{filteredRoster.length} Found</Badge>
                </div>
              </div>
              {filteredRoster.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin border border-border/40 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-muted/10 text-muted-foreground border-b border-border text-[9px] font-black uppercase tracking-widest">
                        <th className="p-3.5">Student Name</th><th className="p-3.5">Roll Number</th>
                        <th className="p-3.5">Email Address</th><th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredRoster.map((s) => (
                        <tr key={s.studentId} className="hover:bg-primary/5 transition-colors group">
                          <td className="p-3 text-foreground font-bold flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/15 transition-all group-hover:scale-105" style={{ borderColor: `${primaryColor}30` }}>
                              {s.firstName.charAt(0)}{s.lastName?.charAt(0) || ""}
                            </div>
                            <span>{s.firstName} {s.lastName}</span>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono">{s.rollNumber}</td>
                          <td className="p-3 text-muted-foreground">{s.email}</td>
                          <td className="p-3 text-right">
                            <button onClick={() => openStudentModal(s.studentId)} className="text-[10px] font-bold text-primary hover:underline cursor-pointer bg-transparent border-none flex items-center gap-0.5 justify-end ml-auto" style={{ color: primaryColor }}>
                              Audit Record <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/5 border border-border/40 rounded-xl text-muted-foreground text-xs font-semibold">No roster results match your filter.</div>
              )}
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {activeTab === "schedule" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5"><ScheduleClassForm courses={courses} userRole={userRole} /></div>
            <div className="lg:col-span-7 sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Scheduled Synchronous Lectures
                </h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">Live streaming lectures configured inside micro-curriculums.</p>
              </div>
              <div className="space-y-4">
                {(liveSessions.length > 0 ? liveSessions : [
                  { id: "mock-1", name: "VLSI Circuit Layout Design Review", description: "Interactive feedback session review for physical layout synthesis cohort batch trainees." },
                  { id: "mock-2", name: "Semiconductor Module 2 Sync Q&A", description: "Live query explanation session for Silicon Fabrication processes and lab assignments." },
                ]).map((session: any) => (
                  <div key={session.id} className="p-4 bg-muted/15 border border-border/40 rounded-xl space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase bg-primary/10 text-primary border border-primary/20">Live Class</Badge>
                        <h4 className="text-xs font-black text-foreground mt-1.5 leading-snug">{session.name || session.title}</h4>
                      </div>
                      <a href="https://zoom.us" target="_blank" rel="noreferrer" className="px-3 py-1 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:scale-105 transition-transform" style={{ backgroundColor: primaryColor }}>Join Zoom</a>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{session.description || "Micro-curriculum live sync video class session."}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CURRICULUM ── */}
        {activeTab === "curriculum" && (
          <div className="max-w-3xl mx-auto">
            <FacultyQuickConfigForm courses={courses} primaryColor={primaryColor} userRole={userRole} />
          </div>
        )}

        {/* ── SUBMISSIONS ── */}
        {activeTab === "submissions" && (
          <div className="space-y-6">
            <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Capstone Project Submissions
                </h3>
                <p className="text-[9px] text-muted-foreground">Review, test, and evaluate Capstone Projects submitted by trainees.</p>
              </div>
              {submissionsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-black uppercase tracking-wider text-[9px]">
                        <th className="py-3 px-4">Trainee</th><th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Git Repository</th><th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Score</th><th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {submissionsList.map((sub) => {
                        const studentName = sub.student?.user ? `${sub.student.user.firstName} ${sub.student.user.lastName || ""}` : "Trainee";
                        return (
                          <tr key={sub.id} className="hover:bg-secondary/15 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground">{studentName}</div>
                              <div className="text-[9px] text-muted-foreground font-mono">{sub.student?.rollNumber || "N/A"}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground">{sub.project?.title || "Capstone Project"}</div>
                              <div className="text-[9px] text-muted-foreground">{sub.project?.course?.name || "Course"}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[10px]">
                              <div className="flex items-center gap-2">
                                <a href={sub.gitRepoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold flex items-center gap-0.5">Repo URL ↗</a>
                                {sub.documentationUrl && <a href={sub.documentationUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-0.5">Docs ↗</a>}
                              </div>
                              <div className="text-[9px] text-muted-foreground mt-0.5">Sub: {formatDate(sub.submittedAt)}</div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge variant="outline" className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${sub.status === "approved" ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" : sub.status === "failed" ? "bg-rose-500/10 text-rose-450 border-rose-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"}`}>
                                {sub.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-foreground">{sub.grade ? `${sub.grade}/100` : "-"}</td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                disabled={userRole === "Guest"}
                                onClick={() => openGradeModal(sub)}
                                className="text-[9px] font-black uppercase tracking-wider bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer disabled:opacity-50"
                                style={{ borderColor: primaryColor }}
                              >
                                {userRole === "Guest" ? "Read Only" : sub.grade ? "Re-evaluate" : "Evaluate"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] text-muted-foreground font-semibold px-1">No submissions received yet. Capstone projects available for this cohort:</p>
                  {capstoneProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {capstoneProjects.map((proj: any) => (
                        <div key={proj.id} className="p-4 bg-muted/10 border border-border/50 rounded-xl space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded border border-border/40">{proj.course?.code || "Capstone"}</span>
                              <h4 className="text-xs font-black text-foreground mt-1.5 leading-snug">{proj.title}</h4>
                            </div>
                            <span className="shrink-0 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">{proj.difficulty || "Advanced"}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{proj.description?.split("\n")[0]}</p>
                          <div className="text-[9px] text-muted-foreground font-mono">Duration: {proj.durationWeeks} weeks</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground text-xs font-semibold bg-muted/5 border border-border/40 rounded-xl">No capstone projects configured for this tenant yet.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUBJECTIVE GRADING ── */}
        {activeTab === "subjective" && (
          <div className="space-y-6">
            <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Subjective Assessments Evaluator Portal
                  </h3>
                  <p className="text-[9px] text-muted-foreground">Review, score rubrics, and write technical feedback comments for student subjective analysis submissions.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input type="text" placeholder="Search by trainee or assignment..." value={subSearch} onChange={(e) => setSubSearch(e.target.value)} className="w-full h-8 pl-9 pr-3 text-xs bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:border-primary/50 text-foreground" />
                </div>
              </div>

              {filteredSubmissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-black uppercase tracking-wider text-[9px]">
                        <th className="py-3 px-4">Trainee</th>
                        <th className="py-3 px-4">Subjective Analysis Assignment</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Score</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {filteredSubmissions.map((sub) => {
                        const studentName = sub.student?.user ? `${sub.student.user.firstName} ${sub.student.user.lastName || ""}` : "Trainee";
                        return (
                          <tr key={sub.id} className="hover:bg-secondary/15 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground">{studentName}</div>
                              <div className="text-[9px] text-muted-foreground font-mono">{sub.student?.rollNumber || "N/A"}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground">{sub.title}</div>
                              <div className="text-[9px] text-muted-foreground">{sub.course?.name || "Course"}</div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${sub.status === "graded" ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/25" : "bg-amber-500/10 text-amber-500 border-amber-500/25 animate-pulse"}`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-foreground">{sub.score !== null && sub.score !== undefined ? `${sub.score}/100` : "-"}</td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                disabled={userRole === "Guest"}
                                onClick={() => openSubGradeModal(sub)}
                                className="text-[9px] font-black uppercase tracking-wider bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer disabled:opacity-50"
                                style={{ borderColor: primaryColor }}
                              >
                                {userRole === "Guest" ? "Read Only" : sub.score !== null && sub.score !== undefined ? "Re-evaluate" : "Evaluate"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/5 border border-border/40 rounded-xl text-muted-foreground text-xs font-semibold">No subjective submissions match your query.</div>
              )}
            </div>
          </div>
        )}

        {/* ── PROCTORING ── */}
        {activeTab === "proctoring" && enableProctoring && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Real-time Proctoring Audit Center
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Monitor tab focus events, browser escapes, and web proctor infractions.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input type="text" placeholder="Filter by trainee name..." value={proctorSearchTerm} onChange={(e) => setProctorSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-secondary/25 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50" />
                </div>
              </div>
              {proctorAttempts.filter((p) => p.studentName.toLowerCase().includes(proctorSearchTerm.toLowerCase())).length > 0 ? (
                <div className="overflow-x-auto border border-border/40 rounded-xl bg-muted/5">
                  <table className="w-full border-collapse text-left text-xs font-semibold">
                    <thead>
                      <tr className="border-b border-border bg-muted/15 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        <th className="p-3 px-4">Trainee Learner</th><th className="p-3 px-4">Target Assessment</th>
                        <th className="p-3 px-4 text-center">Status</th><th className="p-3 px-4 text-center">Infractions Count</th>
                        <th className="p-3 px-4">Last Verified Timestamp</th><th className="p-3 px-4 text-right">Audit Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 text-foreground">
                      {proctorAttempts.filter((p) => p.studentName.toLowerCase().includes(proctorSearchTerm.toLowerCase())).map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-muted/5 transition-colors">
                          <td className="py-3 px-4 font-extrabold flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0" style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}>
                              {attempt.studentName.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <span className="truncate">{attempt.studentName}</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-medium">{attempt.quizTitle}</td>
                          <td className="py-3 px-4 text-center">
                            {attempt.status === "flagged" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/25">⚠️ Flagged</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">✓ Cleared</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-foreground">{attempt.infractionCount}</td>
                          <td className="py-3 px-4 text-muted-foreground font-mono text-[10.5px]">{formatReadableDate(attempt.lastUpdated)}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => openProctorAudit(attempt)} className="text-[9px] font-black uppercase tracking-wider bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer" style={{ borderColor: primaryColor }}>
                              Review Feed
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-xs font-semibold">No matching proctor sessions found.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Cohort Live Sessions & Timetables
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium">Schedule Zoom calls, setup meeting agendas, and configure trainer session timetables.</p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="px-3.5 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                style={{ backgroundColor: primaryColor }}
              >
                + Schedule Session
              </button>
            </div>

            {localSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {localSessions.map((session) => {
                  const sTime = new Date(session.startTime);
                  const eTime = new Date(session.endTime);
                  return (
                    <div key={session.id} className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 border border-border/40 space-y-4 shadow-sm flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[8px] font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>
                            {session.batch?.name || "All Batches"}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground font-mono">
                            {sTime.toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-foreground leading-snug">{session.title}</h4>
                        {session.description && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{session.description}</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border/50 space-y-3">
                        <div className="flex justify-between text-[9px] font-semibold text-muted-foreground">
                          <span>Time: {sTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {eTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>Instructor: {session.instructor ? `${session.instructor.firstName} ${session.instructor.lastName || ""}` : "Unassigned"}</span>
                        </div>
                        {session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                          >
                            Join Meeting Link 🎥
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-muted/5 border border-border/40 rounded-3xl text-muted-foreground text-xs font-semibold">
                No sessions or timetables scheduled yet. Click "+ Schedule Session" to setup your first class.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Grade Evaluation Modal ── */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleGradeSubmission} className="bg-popover border border-border p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary" style={{ color: primaryColor }}>Project Evaluation</h3>
                <h4 className="text-sm font-bold text-foreground mt-1">{selectedSubmission.student?.user?.firstName} {selectedSubmission.student?.user?.lastName || ""}</h4>
              </div>
              <button type="button" onClick={closeGradeModal} className="text-muted-foreground hover:text-foreground text-sm font-bold w-6 h-6 flex items-center justify-center rounded-lg border border-border cursor-pointer">✕</button>
            </div>

            {gradingMessage && (
              <div className={`p-3 rounded-lg text-xs font-bold ${gradingMessage.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                {gradingMessage.text}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Capstone Project</span>
                <p className="font-bold text-foreground">{selectedSubmission.project?.title}</p>
              </div>
              <div className="p-3 bg-secondary/35 rounded-xl border border-border/80 space-y-2.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">Git Repository</span>
                  {selectedSubmission.gitRepoUrl ? (
                    <a href={selectedSubmission.gitRepoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-extrabold flex items-center gap-1 text-[11px]" style={{ color: primaryColor }}>
                      Open Repository <ArrowUpRight className="w-3 h-3" />
                    </a>
                  ) : <span className="text-muted-foreground font-semibold">Not provided</span>}
                </div>
                {selectedSubmission.documentationUrl && (
                  <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase font-black">Project Documentation</span>
                    <a href={selectedSubmission.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-extrabold flex items-center gap-1 text-[11px]" style={{ color: primaryColor }}>
                      Open Docs <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Evaluation Status</label>
                  <select value={gradeStatus} onChange={(e: any) => setGradeStatus(e.target.value)} className="w-full bg-card border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="approved" className="bg-card text-foreground">Approved / Pass</option>
                    <option value="failed" className="bg-card text-foreground">Failed / Resubmit</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Score (0-100)</label>
                  <input type="number" min="0" max="100" required value={gradeScore} onChange={(e: any) => setGradeScore(parseInt(e.target.value) || 0)} className="w-full bg-secondary/35 border border-border rounded-lg p-2 text-foreground focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Evaluation Feedback / Comments</label>
                <textarea required rows={4} value={gradeFeedback} placeholder="Provide structured feedback..." onChange={(e: any) => setGradeFeedback(e.target.value)} className="w-full bg-secondary/35 border border-border rounded-lg p-2.5 text-foreground focus:outline-none placeholder:text-muted-foreground" />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-border/60">
              <button type="button" onClick={closeGradeModal} className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
              <button type="submit" disabled={isGradingSubmitting} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-primary cursor-pointer disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                {isGradingSubmitting ? "Submitting..." : "Submit Grade"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Subjective Grading Modal ── */}
      {isSubModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <form onSubmit={handleSubGradeSubmission} className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-primary/5">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Manual Subjective Evaluation</h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Trainee: {selectedSub.student?.user ? `${selectedSub.student.user.firstName} ${selectedSub.student.user.lastName || ""}` : "Student"}</p>
              </div>
              <button type="button" onClick={closeSubGradeModal} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] text-left">
              {subGradingMessage && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${subGradingMessage.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-450" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                  {subGradingMessage.text}
                </div>
              )}

              <div className="p-4 bg-secondary/15 rounded-xl border border-border/40 space-y-2">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Question Prompt / Requirement</span>
                <p className="text-[10px] text-foreground font-semibold leading-relaxed font-sans">{selectedSub.questionText}</p>
              </div>

              <div className="p-4 bg-secondary/25 rounded-xl border border-border/50 space-y-2">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Trainee Submitted Answer Response</span>
                <p className="text-[10.5px] text-foreground leading-relaxed whitespace-pre-wrap font-sans bg-card border border-border/30 p-3.5 rounded-xl">{selectedSub.studentAnswer}</p>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-4">
                <span className="text-[10px] font-black uppercase text-foreground tracking-widest block">Manual Rubric Grading Evaluation</span>
                
                <div className="space-y-3.5">
                  {subRubrics.map((rub: any, idx: number) => (
                    <div key={idx} className="p-4 bg-card border border-border/50 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10.5px] font-black text-foreground">{rub.criteria}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={rub.maxScore}
                            required
                            value={rub.score}
                            onChange={(e) => handleSubGradeScoreChange(idx, parseInt(e.target.value) || 0)}
                            className="w-16 bg-secondary/35 border border-border rounded-lg p-1.5 text-center text-xs font-bold text-foreground focus:outline-none"
                          />
                          <span className="text-[10px] text-muted-foreground font-bold">/ {rub.maxScore} pts</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder={`Critique comment feedback for ${rub.criteria.toLowerCase()}...`}
                        value={rub.feedback || ""}
                        onChange={(e) => handleSubGradeFeedbackChange(idx, e.target.value)}
                        className="w-full bg-secondary/15 border border-border/35 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/60 pt-4">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex flex-col justify-between" style={{ borderColor: `${primaryColor}20`, backgroundColor: `${primaryColor}05` }}>
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Aggregated Score</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-primary" style={{ color: primaryColor }}>{subGradeScore}</span>
                    <span className="text-xs text-muted-foreground font-bold">/ 100 overall</span>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Assessor General Feedback / Comments</label>
                  <textarea
                    required
                    rows={3}
                    value={subGradeFeedback}
                    placeholder="Write a summary evaluation overview, highlighting positive findings or details that need attention..."
                    onChange={(e: any) => setSubGradeFeedback(e.target.value)}
                    className="w-full bg-secondary/25 border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50 leading-relaxed font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-5 border-t border-border/60 bg-muted/5 shrink-0">
              <button type="button" onClick={closeSubGradeModal} className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
              <button type="submit" disabled={isSubGradingSubmitting} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-primary cursor-pointer disabled:opacity-50 shadow-md" style={{ backgroundColor: primaryColor }}>
                {isSubGradingSubmitting ? "Submitting..." : "Finalize Score"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Proctor Audit Drawer ── */}
      {selectedProctorAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" style={{ color: primaryColor }} />
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Webcam & System Audit: {selectedProctorAttempt.studentName}</h4>
              </div>
              <button onClick={closeProctorAudit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors cursor-pointer">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh]">
              <div className="space-y-4">
                <div className="border-b border-border/40 pb-2">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Live Camera Outline Snapshot</span>
                  <span className="text-[10px] text-muted-foreground">AI face boundary verification tracking feed</span>
                </div>
                <div className="relative aspect-video bg-slate-950 rounded-2xl border border-border overflow-hidden flex flex-col items-center justify-center">
                  <svg className="w-3/4 h-3/4 text-emerald-500/20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="15" y="10" width="70" height="80" strokeDasharray="3 3" className={selectedProctorAttempt.status === "flagged" ? "stroke-rose-500" : "stroke-emerald-500"} />
                    <path d="M 50,20 C 35,20 30,35 30,55 C 30,75 40,85 50,85 C 60,85 70,75 70,55 C 70,35 65,20 50,20 Z" />
                    <circle cx="42" cy="45" r="2" fill="currentColor" /><circle cx="58" cy="45" r="2" fill="currentColor" />
                    <path d="M 45,55 Q 50,58 55,55" /><path d="M 47,68 Q 50,71 53,68" strokeWidth="2" className={selectedProctorAttempt.status === "flagged" ? "stroke-rose-500" : "stroke-emerald-500"} />
                    <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 4" />
                    <line x1="15" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 4" />
                  </svg>
                  {selectedProctorAttempt.status === "flagged" ? (
                    <div className="absolute top-3 left-3 right-3 bg-rose-500/90 text-white p-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between">
                      <span>⚠️ INFRACTION DETECTED: GAZE DEVIATION</span><span className="font-mono bg-rose-700 px-1.5 py-0.5 rounded">FLAGGED</span>
                    </div>
                  ) : (
                    <div className="absolute top-3 left-3 right-3 bg-emerald-500/90 text-white p-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between">
                      <span>✓ LEARNER IDENTITY VERIFIED</span><span className="font-mono bg-emerald-700 px-1.5 py-0.5 rounded">SECURE</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 text-[9px] font-mono text-muted-foreground/80 bg-black/60 px-2 py-0.5 rounded">fps: 30 | latency: 4ms</div>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-center">
                  {[
                    { label: "Pose Variance", value: selectedProctorAttempt.status === "flagged" ? "High (42%)" : "Low (4%)" },
                    { label: "Gaze Focus", value: selectedProctorAttempt.status === "flagged" ? "Deviation" : "Centered" },
                    { label: "Face Landmarks", value: "68 detected" },
                  ].map((metric) => (
                    <div key={metric.label} className="bg-secondary/20 p-2 border border-border/40 rounded-xl">
                      <span className="text-muted-foreground block uppercase">{metric.label}</span>
                      <strong className={selectedProctorAttempt.status === "flagged" && metric.label !== "Face Landmarks" ? "text-rose-450" : "text-emerald-450"}>{metric.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="border-b border-border/40 pb-2">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Verbal & Event Logs</span>
                  <span className="text-[10px] text-muted-foreground">Session chronological actions</span>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-56 scrollbar-thin pr-1">
                  {selectedProctorAttempt.events.map((evt: any, idx: number) => (
                    <div key={idx} className="p-3 bg-secondary/15 border border-border/40 rounded-xl space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-extrabold text-foreground flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${evt.type.toLowerCase().includes("alert") || evt.type.toLowerCase().includes("switch") || evt.type.toLowerCase().includes("exit") ? "bg-rose-500" : "bg-emerald-500"}`} />
                          {evt.type}
                        </span>
                        <span className="text-muted-foreground font-mono">{evt.time}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal font-medium">{evt.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-border flex gap-3">
                  <button type="button" onClick={() => { clearProctorAttempt(selectedProctorAttempt.id); closeProctorAudit(); }} className="flex-1 py-2 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md cursor-pointer text-center">
                    Dismiss & Clear Flags
                  </button>
                  <button type="button" onClick={() => { alert(`Infraction flags confirmed for ${selectedProctorAttempt.studentName}. A notification has been dispatched to their profile.`); closeProctorAudit(); }} className="flex-1 py-2 bg-rose-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md cursor-pointer text-center">
                    Confirm Infraction
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Schedule Session Modal ── */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleScheduleSubmit} className="bg-popover border border-border p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 sexy-border-glow">
            <div className="flex justify-between items-center border-b border-border pb-3 text-left">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary" style={{ color: primaryColor }}>Schedule Live Class</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">Setup meeting slots, times, and agendas.</p>
              </div>
              <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold w-6 h-6 flex items-center justify-center rounded-lg border border-border cursor-pointer">✕</button>
            </div>

            {scheduleError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-[10px] font-bold text-left">
                {scheduleError}
              </div>
            )}

            <div className="space-y-3.5 text-xs text-left">
              <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground uppercase font-black">Target Cohort Batch</label>
                <select
                  required
                  value={scheduleBatchId}
                  onChange={(e) => setScheduleBatchId(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl p-2.5 text-foreground focus:outline-none"
                >
                  {batchesList.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground uppercase font-black">Session Title / Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Intro to UI Design Systems"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl p-2.5 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground uppercase font-black">Meeting Description / Syllabus</label>
                <textarea
                  rows={2}
                  placeholder="Agenda notes..."
                  value={scheduleDesc}
                  onChange={(e) => setScheduleDesc(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl p-2.5 text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground uppercase font-black">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    className="w-full bg-secondary/35 border border-border rounded-xl p-2.5 text-foreground focus:outline-none text-[10.5px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground uppercase font-black">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="w-full bg-secondary/35 border border-border rounded-xl p-2.5 text-foreground focus:outline-none text-[10.5px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground uppercase font-black">Zoom Meeting URL</label>
                <input
                  type="url"
                  required
                  value={scheduleMeetingUrl}
                  onChange={(e) => setScheduleMeetingUrl(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl p-2.5 text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-border/60">
              <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
              <button type="submit" disabled={isScheduling} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-primary cursor-pointer disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                {isScheduling ? "Scheduling..." : "Create Slot"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
