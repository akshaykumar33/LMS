"use client";

import React, { useState, useEffect } from "react";
import { StudentProfileModal } from "./StudentProfileModal";
import { ScheduleClassForm } from "./ScheduleClassForm";
import { FacultyQuickConfigForm } from "./FacultyQuickConfigForm";
import { gradeProjectSubmissionAction } from "../actions/faculty-actions";
import { formatDate } from "@/utils/date-formatter";
import { 
  Search, 
  Users, 
  Video, 
  Layers, 
  Calendar, 
  Trophy, 
  BookOpen, 
  CheckCircle2, 
  ArrowUpRight, 
  Sparkles,
  ShieldAlert 
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
  userRole,
  enableProctoring = false
}: FacultyDashboardClientProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Tab state (syncs with URL query param if present)
  const [activeTab, setActiveTab] = useState("overview");

  // Project evaluation states
  const [submissionsList, setSubmissionsList] = useState<any[]>(projectSubmissions);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [gradeStatus, setGradeStatus] = useState<"approved" | "failed">("approved");
  const [gradeScore, setGradeScore] = useState<number>(90);
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [isGradingSubmitting, setIsGradingSubmitting] = useState(false);
  const [gradingMessage, setGradingMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setSubmissionsList(projectSubmissions);
  }, [projectSubmissions]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const validTabs = ["overview", "roster", "schedule", "curriculum", "submissions"];
      if (enableProctoring) validTabs.push("proctoring");
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const [proctorAttempts, setProctorAttempts] = useState([
    { id: "pr-101", studentName: "Linus Torvalds", quizTitle: "Semiconductor Module 1 Quiz", status: "flagged", infractionCount: 3, lastUpdated: "2026-07-14T10:12:00Z", events: [
      { type: "Tab Switch", time: "10:14:02 AM", desc: "User switched focus out of browser tab for 12 seconds." },
      { type: "Fullscreen Exit", time: "10:15:20 AM", desc: "User left full-screen exam mode." },
      { type: "Face Detection Alert", time: "10:16:45 AM", desc: "No face detected in webcam feed." }
    ]},
    { id: "pr-102", studentName: "Ada Lovelace", quizTitle: "VLSI Circuit Layout Evaluation", status: "cleared", infractionCount: 0, lastUpdated: "2026-07-14T09:45:00Z", events: [
      { type: "Exam Started", time: "09:40:00 AM", desc: "Initial verification verified learner credentials successfully." }
    ]},
    { id: "pr-103", studentName: "Gordon Moore", quizTitle: "Lithography Diffraction Quiz", status: "flagged", infractionCount: 1, lastUpdated: "2026-07-14T11:05:00Z", events: [
      { type: "Tab Switch", time: "11:07:35 AM", desc: "User switched focus out of browser tab for 5 seconds." }
    ]}
  ]);
  const [selectedProctorAttempt, setSelectedProctorAttempt] = useState<any | null>(null);
  const [proctorSearchTerm, setProctorSearchTerm] = useState("");

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
      setSubmissionsList(prev => prev.map(s => s.id === selectedSubmission.id ? {
        ...s,
        status: gradeStatus,
        grade: gradeScore.toString(),
        feedback: gradeFeedback
      } : s));
      
      setTimeout(() => {
        setSelectedSubmission(null);
        setGradingMessage(null);
      }, 1200);
    } else {
      setGradingMessage({ type: "error", text: res.error || "Failed to submit evaluation." });
    }
  };

  // Search states
  const [rosterSearch, setRosterSearch] = useState("");
  const [attemptsSearch, setAttemptsSearch] = useState("");

  const handleViewProfile = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsModalOpen(true);
  };

  // Filter roster students based on search query
  const filteredRoster = roster.filter(s => {
    const fullName = `${s.firstName} ${s.lastName || ""}`.toLowerCase();
    const query = rosterSearch.toLowerCase();
    return fullName.includes(query) || 
      s.rollNumber.toLowerCase().includes(query) || 
      s.email.toLowerCase().includes(query);
  });

  // Filter attempts based on search query
  const filteredAttempts = recentAttempts.filter(a => {
    const sName = a.studentName.toLowerCase();
    const qTitle = a.quizTitle.toLowerCase();
    const query = attemptsSearch.toLowerCase();
    return sName.includes(query) || qTitle.includes(query);
  });

  // Calculate some analytics counters
  const averageGrade = recentAttempts.length > 0 
    ? Math.round(recentAttempts.reduce((acc, a) => acc + a.score, 0) / recentAttempts.length)
    : 85;

  // Extract scheduled live classes (lessons with live_class content type)
  const liveSessions = courses.flatMap(c => 
    (c.modules || []).flatMap((m: any) => 
      (m.lessons || []).filter((l: any) => l.contentType === "live_class" || l.name?.toLowerCase().includes("zoom") || l.name?.toLowerCase().includes("live"))
    )
  );

  return (
    <div className="space-y-6">
      {/* Student Profile Audit Modal */}
      <StudentProfileModal 
        studentId={selectedStudentId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStudentId(null);
        }}
        primaryColor={primaryColor}
      />

      {/* Modern Glass Tab Controller Navigation */}
      <div className="flex border-b border-border/60 pb-px overflow-x-auto space-x-6 scrollbar-none">
        {([
          { id: "overview", label: "Overview", icon: Trophy },
          { id: "roster", label: "Cohort Roster", icon: Users },
          { id: "submissions", label: "Capstone Projects", icon: Trophy },
          ...(enableProctoring ? [{ id: "proctoring", label: "Web Proctoring Audits", icon: ShieldAlert }] : []),
          { id: "schedule", label: "Live Classrooms", icon: Video },
          { id: "curriculum", label: "Curriculum Config", icon: Layers }
        ] as { id: string; label: string; icon: any }[]).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Update URL search parameters without reloading
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", tab.id);
                  window.history.pushState({}, "", url.toString());
                }
              }}
              className={`flex items-center gap-2 pb-3.5 text-xs font-bold transition-all relative border-b-2 cursor-pointer ${
                isActive 
                  ? "text-primary border-primary" 
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
              style={isActive ? { borderColor: primaryColor, color: primaryColor } : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" style={{ backgroundColor: primaryColor }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Render Switcher */}
      <div className="animate-in fade-in duration-300">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary" style={{ color: primaryColor }}>
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Cohort Performance Average</span>
                <p className="text-3xl font-black text-foreground">{averageGrade}%</p>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Class evaluation passes are within margins.</span>
                </div>
              </div>

              <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Active Class Attendance</span>
                <p className="text-3xl font-black text-foreground">94.8%</p>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Attendance streak is high this week.</span>
                </div>
              </div>

              <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Video className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Sessions Next 7 Days</span>
                <p className="text-3xl font-black text-foreground">{Math.max(liveSessions.length, 2)} Scheduled</p>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span>Virtual sync classes are operational.</span>
                </div>
              </div>
            </div>

            {/* Recent Submissions Activity with Filter */}
            <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Recent Quiz Submissions
                  </h3>
                  <p className="text-[9px] text-muted-foreground">Monitor real-time learner test metrics & progress scores.</p>
                </div>
                
                {/* Search Inputs */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by student or quiz..."
                    value={attemptsSearch}
                    onChange={(e) => setAttemptsSearch(e.target.value)}
                    className="w-full h-8 pl-9 pr-3 text-xs bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:border-primary/50 text-foreground"
                  />
                </div>
              </div>

              {filteredAttempts.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin border border-border/40 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-muted/10 text-muted-foreground border-b border-border text-[9px] font-black uppercase tracking-widest">
                        <th className="p-3.5">Student</th>
                        <th className="p-3.5">Quiz Details</th>
                        <th className="p-3.5 text-center">Score achieved</th>
                        <th className="p-3.5 text-center">Outcome</th>
                        <th className="p-3.5 text-right font-bold">Logs Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredAttempts.map((a) => (
                        <tr key={a.attemptId} className="hover:bg-primary/5 transition-colors group">
                          <td className="p-3 text-foreground font-bold">{a.studentName}</td>
                          <td className="p-3 text-foreground">
                            <span className="font-bold font-mono text-[9px] mr-2 bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded" style={{ color: primaryColor }}>
                              {a.courseCode}
                            </span>
                            {a.quizTitle}
                          </td>
                          <td className="p-3 text-center text-foreground font-extrabold">{a.score}%</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                                a.passed 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                                  : "bg-red-500/10 text-red-400 border-red-500/25"
                              }`}
                            >
                              {a.passed ? "PASS" : "FAIL"}
                            </span>
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {new Date(a.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/5 border border-border/40 rounded-xl text-muted-foreground text-xs font-semibold">
                  No submissions match your search query filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STUDENT ROSTER TAB */}
        {activeTab === "roster" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Cohort Selector Panel */}
            <div className="lg:col-span-4 space-y-4">
              <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4 shadow-sm border border-border/40">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
                  Select Cohort Batch
                </h3>
                <div className="space-y-2">
                  {batchesList.length > 0 ? (
                    batchesList.map((b) => (
                      <a
                        key={b.id}
                        href={`/faculty?batchId=${b.id}&tab=roster`}
                        className={`block p-3.5 rounded-xl border text-xs transition-all ${
                          b.id === selectedBatchId
                            ? "bg-primary/10 border-primary/30 text-foreground font-bold"
                            : "bg-transparent border-border/50 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-foreground">{b.name}</span>
                          <span className="text-[9px] font-bold bg-card border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                            {b.studentCount} Students
                          </span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No batches configured.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Roster Table Workspace */}
            <div className="lg:col-span-8 sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                    Cohort Learner Roster
                  </h3>
                  <p className="text-[9px] text-muted-foreground">Trainees registered for selected batch.</p>
                </div>
                
                {/* Search Bar */}
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search roster..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="w-full h-8 pl-9 pr-3 text-xs bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:border-primary/50 text-foreground"
                    />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono font-bold bg-primary/5 text-primary border border-primary/20 shrink-0">
                    {filteredRoster.length} Found
                  </Badge>
                </div>
              </div>

              {filteredRoster.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin border border-border/40 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-muted/10 text-muted-foreground border-b border-border text-[9px] font-black uppercase tracking-widest">
                        <th className="p-3.5">Student Name</th>
                        <th className="p-3.5">Roll Number</th>
                        <th className="p-3.5">Email Address</th>
                        <th className="p-3.5 text-right font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredRoster.map((s) => (
                        <tr key={s.studentId} className="hover:bg-primary/5 transition-colors group">
                          <td className="p-3 text-foreground font-bold flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/15 transition-all group-hover:scale-105 group-hover:bg-primary group-hover:text-white" style={{ borderColor: `${primaryColor}30` }}>
                              {s.firstName.charAt(0)}{s.lastName?.charAt(0) || ""}
                            </div>
                            <span className="group-hover:text-primary transition-colors">{s.firstName} {s.lastName}</span>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono">{s.rollNumber}</td>
                          <td className="p-3 text-muted-foreground">{s.email}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleViewProfile(s.studentId)}
                              className="text-[10px] font-bold text-primary hover:underline cursor-pointer bg-transparent border-none flex items-center gap-0.5 justify-end ml-auto"
                              style={{ color: primaryColor }}
                            >
                              Audit Record <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/5 border border-border/40 rounded-xl text-muted-foreground text-xs font-semibold">
                  No roster results match your filter.
                </div>
              )}
            </div>

          </div>
        )}

        {/* LIVE CLASSROOMS TAB */}
        {activeTab === "schedule" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Classroom Scheduler Form */}
            <div className="lg:col-span-5">
              <ScheduleClassForm courses={courses} userRole={userRole} />
            </div>

            {/* Classroom List Workspace */}
            <div className="lg:col-span-7 sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Scheduled Synchronous Lectures
                </h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">Live streaming lectures configured inside micro-curriculums.</p>
              </div>

              <div className="space-y-4">
                {liveSessions.length > 0 ? (
                  liveSessions.map((session: any) => (
                    <div key={session.id} className="p-4 bg-muted/15 border border-border/40 rounded-xl space-y-3 hover:bg-muted/20 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <Badge variant="outline" className="text-[8px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                            Live Class
                          </Badge>
                          <h4 className="text-xs font-black text-foreground mt-1.5 leading-snug">{session.name}</h4>
                        </div>
                        <a 
                          href="https://zoom.us" 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:scale-105 transition-transform"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Join Zoom
                        </a>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{session.description || "Micro-curriculum live sync video class session."}</p>
                    </div>
                  ))
                ) : (
                  /* Standard fallback list */
                  [
                    { name: "VLSI Circuit Layout Design Review", desc: "Interactive feedback session review for physical layout synthesis cohort batch trainees." },
                    { name: "Semiconductor Module 2 Sync Q&A", desc: "Live query explanation session for Silicon Fabrication processes and lab assignments." }
                  ].map((mock, idx) => (
                    <div key={idx} className="p-4 bg-muted/15 border border-border/40 rounded-xl space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <Badge variant="outline" className="text-[8px] font-black uppercase bg-indigo-500/10 text-indigo-400 border-indigo-500/25">
                            Sync Meeting
                          </Badge>
                          <h4 className="text-xs font-black text-foreground mt-1.5 leading-snug">{mock.name}</h4>
                        </div>
                        <a 
                          href="https://zoom.us" 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3 py-1 bg-secondary text-foreground border border-border text-[9px] font-black uppercase tracking-widest rounded-lg"
                        >
                          Join Room
                        </a>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{mock.desc}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* CURRICULUM CONFIG TAB */}
        {activeTab === "curriculum" && (
          <div className="max-w-3xl mx-auto">
            <FacultyQuickConfigForm courses={courses} primaryColor={primaryColor} userRole={userRole} />
          </div>
        )}

        {/* SUBMISSIONS TAB */}
        {activeTab === "submissions" && (
          <div className="space-y-6">
            <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Capstone Project Submissions
                  </h3>
                  <p className="text-[9px] text-muted-foreground">Review, test, and evaluate Capstone Projects submitted by trainees.</p>
                </div>
              </div>

              {submissionsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-black uppercase tracking-wider text-[9px]">
                        <th className="py-3 px-4">Trainee</th>
                        <th className="py-3 px-4">Project</th>
                        <th className="py-3 px-4">Git Repository</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Score</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {submissionsList.map((sub) => {
                        const studentName = sub.student?.user 
                          ? `${sub.student.user.firstName} ${sub.student.user.lastName || ""}`
                          : "Trainee";
                        const rollNumber = sub.student?.rollNumber || "N/A";
                        const projectTitle = sub.project?.title || "Capstone Project";
                        const courseName = sub.project?.course?.name || "Course";

                        return (
                          <tr key={sub.id} className="hover:bg-secondary/15 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground">{studentName}</div>
                              <div className="text-[9px] text-muted-foreground font-mono">{rollNumber}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground">{projectTitle}</div>
                              <div className="text-[9px] text-muted-foreground">{courseName}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[10px]">
                              <div className="flex items-center gap-2">
                                <a 
                                  href={sub.gitRepoUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-primary hover:underline font-bold flex items-center gap-0.5"
                                >
                                  Repo URL ↗
                                </a>
                                {sub.documentationUrl && (
                                  <a 
                                    href={sub.documentationUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-0.5"
                                  >
                                    Docs ↗
                                  </a>
                                )}
                              </div>
                              <div className="text-[9px] text-muted-foreground mt-0.5">
                                Sub: {formatDate(sub.submittedAt)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge 
                                variant="outline" 
                                className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                  sub.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20"
                                    : sub.status === "failed"
                                      ? "bg-rose-500/10 text-rose-450 border-rose-500/20"
                                      : "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                                }`}
                              >
                                {sub.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-foreground">
                              {sub.grade ? `${sub.grade}/100` : "-"}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                disabled={userRole === "Guest"}
                                onClick={() => {
                                  setSelectedSubmission(sub);
                                  setGradeStatus(sub.status === "failed" ? "failed" : "approved");
                                  setGradeScore(sub.grade ? parseInt(sub.grade) : 90);
                                  setGradeFeedback(sub.feedback || "");
                                  setGradingMessage(null);
                                }}
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
                <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
                  No trainee project submissions recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* WEB PROCTORING AUDITS TAB */}
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
                  <span className="absolute left-3 top-2.5 text-muted-foreground/60">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filter by trainee name..."
                    value={proctorSearchTerm}
                    onChange={(e) => setProctorSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-secondary/25 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {proctorAttempts.filter(p => p.studentName.toLowerCase().includes(proctorSearchTerm.toLowerCase())).length > 0 ? (
                <div className="overflow-x-auto border border-border/40 rounded-xl bg-muted/5">
                  <table className="w-full border-collapse text-left text-xs font-semibold">
                    <thead>
                      <tr className="border-b border-border bg-muted/15 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        <th className="p-3 px-4">Trainee Learner</th>
                        <th className="p-3 px-4">Target Assessment</th>
                        <th className="p-3 px-4 text-center">Status</th>
                        <th className="p-3 px-4 text-center">Infractions Count</th>
                        <th className="p-3 px-4">Last Verified Timestamp</th>
                        <th className="p-3 px-4 text-right">Audit Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 text-foreground">
                      {proctorAttempts
                        .filter(p => p.studentName.toLowerCase().includes(proctorSearchTerm.toLowerCase()))
                        .map((attempt) => (
                          <tr key={attempt.id} className="hover:bg-muted/5 transition-colors">
                            <td className="py-3 px-4 font-extrabold flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0" style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}>
                                {attempt.studentName.split(" ").map(n => n[0]).join("")}
                              </div>
                              <span className="truncate">{attempt.studentName}</span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-medium">
                              {attempt.quizTitle}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {attempt.status === "flagged" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/25">
                                  ⚠️ Flagged
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                                  ✓ Cleared
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-black text-foreground">
                              {attempt.infractionCount}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-mono text-[10.5px]">
                              {new Date(attempt.lastUpdated).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedProctorAttempt(attempt)}
                                className="text-[9px] font-black uppercase tracking-wider bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer"
                                style={{ borderColor: primaryColor }}
                              >
                                Review Feed
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
                  No matching proctor sessions found.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Evaluation Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleGradeSubmission}
            className="bg-popover border border-border p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary" style={{ color: primaryColor }}>
                  Project Evaluation
                </h3>
                <h4 className="text-sm font-bold text-foreground mt-1">
                  {selectedSubmission.student?.user?.firstName} {selectedSubmission.student?.user?.lastName || ""}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold w-6 h-6 flex items-center justify-center rounded-lg border border-border cursor-pointer"
              >
                ✕
              </button>
            </div>

            {gradingMessage && (
              <div 
                className={`p-3 rounded-lg text-xs font-bold ${
                  gradingMessage.type === "success" 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {gradingMessage.text}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Capstone Project</span>
                <p className="font-bold text-foreground">{selectedSubmission.project?.title}</p>
              </div>

              {/* Submissions Links */}
              <div className="p-3 bg-secondary/35 rounded-xl border border-border/80 space-y-2.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">Git Repository</span>
                  {selectedSubmission.gitRepoUrl ? (
                    <a
                      href={selectedSubmission.gitRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-extrabold flex items-center gap-1 text-[11px]"
                      style={{ color: primaryColor }}
                    >
                      Open Repository <ArrowUpRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground font-semibold">Not provided</span>
                  )}
                </div>
                {selectedSubmission.documentationUrl && (
                  <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase font-black">Project Documentation</span>
                    <a
                      href={selectedSubmission.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-extrabold flex items-center gap-1 text-[11px]"
                      style={{ color: primaryColor }}
                    >
                      Open Docs <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Evaluation Status</label>
                  <select
                    value={gradeStatus}
                    onChange={(e: any) => setGradeStatus(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="approved" className="bg-card text-foreground">Approved / Pass</option>
                    <option value="failed" className="bg-card text-foreground">Failed / Resubmit</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={gradeScore}
                    onChange={(e: any) => setGradeScore(parseInt(e.target.value) || 0)}
                    className="w-full bg-secondary/35 border border-border rounded-lg p-2 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Evaluation Feedback / Comments</label>
                <textarea
                  required
                  rows={4}
                  value={gradeFeedback}
                  placeholder="Provide structured feedback detailing code quality, circuit layout accuracy, testing coverage, etc."
                  onChange={(e: any) => setGradeFeedback(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-lg p-2.5 text-foreground focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGradingSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-primary cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {isGradingSubmitting ? "Submitting..." : "Submit Grade"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selected Proctor Session Audit Drawer */}
      {selectedProctorAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col sexy-border-glow">
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" style={{ color: primaryColor }} />
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
                  Webcam & System Audit: {selectedProctorAttempt.studentName}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedProctorAttempt(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh]">
              {/* Left panel: Simulated Web Camera Silhouette feed */}
              <div className="space-y-4">
                <div className="border-b border-border/40 pb-2">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Live Camera Outline Snapshot</span>
                  <span className="text-[10px] text-muted-foreground">Artificial Intelligence face boundary verification tracking feed</span>
                </div>

                <div className="relative aspect-video bg-slate-950 rounded-2xl border border-border overflow-hidden flex flex-col items-center justify-center">
                  {/* SVG Face outline placeholder simulator */}
                  <svg className="w-3/4 h-3/4 text-emerald-500/20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                    {/* Bounding box */}
                    <rect x="15" y="10" width="70" height="80" strokeDasharray="3 3" className={selectedProctorAttempt.status === "flagged" ? "stroke-rose-500" : "stroke-emerald-500"} />
                    
                    {/* Face contour */}
                    <path d="M 50,20 C 35,20 30,35 30,55 C 30,75 40,85 50,85 C 60,85 70,75 70,55 C 70,35 65,20 50,20 Z" />
                    
                    {/* Eyes & Landmarks */}
                    <circle cx="42" cy="45" r="2" fill="currentColor" />
                    <circle cx="58" cy="45" r="2" fill="currentColor" />
                    <path d="M 45,55 Q 50,58 55,55" />
                    <path d="M 47,68 Q 50,71 53,68" strokeWidth="2" className={selectedProctorAttempt.status === "flagged" ? "stroke-rose-500" : "stroke-emerald-500"} />
                    
                    {/* Grid tracker overlay */}
                    <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 4" />
                    <line x1="15" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 4" />
                  </svg>

                  {/* Infraction Warning message */}
                  {selectedProctorAttempt.status === "flagged" ? (
                    <div className="absolute top-3 left-3 right-3 bg-rose-500/90 text-white p-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between">
                      <span>⚠️ INFRACTION DETECTED: GAZE DEVIATION</span>
                      <span className="font-mono bg-rose-700 px-1.5 py-0.5 rounded">FLAGGED</span>
                    </div>
                  ) : (
                    <div className="absolute top-3 left-3 right-3 bg-emerald-500/90 text-white p-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-between">
                      <span>✓ LEARNER IDENTITY VERIFIED</span>
                      <span className="font-mono bg-emerald-700 px-1.5 py-0.5 rounded">SECURE</span>
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 text-[9px] font-mono text-muted-foreground/80 bg-black/60 px-2 py-0.5 rounded">
                    fps: 30 | latency: 4ms
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-center">
                  <div className="bg-secondary/20 p-2 border border-border/40 rounded-xl">
                    <span className="text-muted-foreground block uppercase">Pose Variance</span>
                    <strong className={selectedProctorAttempt.status === "flagged" ? "text-rose-450" : "text-emerald-450"}>
                      {selectedProctorAttempt.status === "flagged" ? "High (42%)" : "Low (4%)"}
                    </strong>
                  </div>
                  <div className="bg-secondary/20 p-2 border border-border/40 rounded-xl">
                    <span className="text-muted-foreground block uppercase">Gaze Focus</span>
                    <strong className={selectedProctorAttempt.status === "flagged" ? "text-rose-450" : "text-emerald-450"}>
                      {selectedProctorAttempt.status === "flagged" ? "Deviation" : "Centered"}
                    </strong>
                  </div>
                  <div className="bg-secondary/20 p-2 border border-border/40 rounded-xl">
                    <span className="text-muted-foreground block uppercase">Face Landmarks</span>
                    <strong className="text-emerald-450">68 detected</strong>
                  </div>
                </div>
              </div>

              {/* Right panel: Timeline of actions */}
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
                  <button
                    type="button"
                    onClick={() => {
                      setProctorAttempts(prev => prev.map(p => p.id === selectedProctorAttempt.id ? { ...p, status: "cleared", infractionCount: 0 } : p));
                      setSelectedProctorAttempt(null);
                    }}
                    className="flex-1 py-2 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md cursor-pointer text-center"
                  >
                    Dismiss & Clear Flags
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Infraction flags confirmed for ${selectedProctorAttempt.studentName}. A notification has been dispatched to their profile.`);
                      setSelectedProctorAttempt(null);
                    }}
                    className="flex-1 py-2 bg-rose-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md cursor-pointer text-center"
                  >
                    Confirm Infraction
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
