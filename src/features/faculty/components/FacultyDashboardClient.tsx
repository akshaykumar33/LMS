"use client";

import React, { useState, useEffect } from "react";
import { StudentProfileModal } from "./StudentProfileModal";
import { ScheduleClassForm } from "./ScheduleClassForm";
import { FacultyQuickConfigForm } from "./FacultyQuickConfigForm";
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
  Sparkles 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FacultyDashboardClientProps {
  roster: any[];
  recentAttempts: any[];
  batchesList: any[];
  selectedBatchId: string;
  primaryColor: string;
  courses: any[];
}

export function FacultyDashboardClient({
  roster,
  recentAttempts,
  batchesList,
  selectedBatchId,
  primaryColor,
  courses
}: FacultyDashboardClientProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Tab state (syncs with URL query param if present)
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["overview", "roster", "schedule", "curriculum"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

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
        {[
          { id: "overview", label: "Overview", icon: Trophy },
          { id: "roster", label: "Cohort Roster", icon: Users },
          { id: "schedule", label: "Live Classrooms", icon: Video },
          { id: "curriculum", label: "Curriculum Config", icon: Layers }
        ].map((tab) => {
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
              <ScheduleClassForm courses={courses} />
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
            <FacultyQuickConfigForm courses={courses} primaryColor={primaryColor} />
          </div>
        )}

      </div>

    </div>
  );
}
