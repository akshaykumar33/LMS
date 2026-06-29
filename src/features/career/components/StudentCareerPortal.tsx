"use client";

import React, { useState } from "react";
import { applyToJobAction } from "../actions/career-actions";
import { ExternalLink, Briefcase, Search, Compass, KanbanSquare, Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface JobPosting {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary: string | null;
  location: string;
  createdAt: Date | string;
}

interface StudentApplication {
  id: string;
  jobId: string;
  status: string;
  resumeUrl: string;
  createdAt: Date | string;
  job: {
    title: string;
    company: string;
  };
}

interface StudentCareerPortalProps {
  jobs: JobPosting[];
  applications: StudentApplication[];
  completedCourses?: { name: string; code: string }[];
}

export function StudentCareerPortal({ jobs, applications: initialApplications, completedCourses = [] }: StudentCareerPortalProps) {
  const [activeView, setActiveView] = useState<"jobs" | "kanban">("jobs");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const [applications, setApplications] = useState<StudentApplication[]>(initialApplications);
  const appliedJobIds = new Set(applications.map((app) => app.jobId));

  const onApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    if (!resumeUrl) {
      setMessage({ type: "error", text: "Resume URL is required." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await applyToJobAction(selectedJob.id, resumeUrl);
      if (res.success) {
        setMessage({ type: "success", text: `Successfully applied to ${selectedJob.company}!` });
        const newApp: StudentApplication = {
          id: Math.random().toString(),
          jobId: selectedJob.id,
          status: "applied",
          resumeUrl,
          createdAt: new Date().toISOString(),
          job: {
            title: selectedJob.title,
            company: selectedJob.company
          }
        };
        setApplications(prev => [newApp, ...prev]);
        setResumeUrl("");
        setTimeout(() => {
          setSelectedJob(null);
          setMessage(null);
        }, 1200);
      } else {
        setMessage({ type: "error", text: res.error || "Failed to submit application." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "offered":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "selected":
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case "interviewing":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "rejected":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    }
  };

  // Filter jobs by search query
  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Kanban Columns
  const kanbanStages = ["applied", "interviewing", "offered", "selected", "rejected"];
  const stageLabels: Record<string, string> = {
    applied: "Applied",
    interviewing: "Interviewing",
    offered: "Offered",
    selected: "Hired/Selected",
    rejected: "Archived"
  };

  return (
    <div className="space-y-6">
      
      {/* View Selector Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex gap-2">
          <Button
            variant={activeView === "jobs" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveView("jobs")}
            className="text-[10px] font-black uppercase tracking-widest gap-1.5 h-8 px-3.5 rounded-lg"
          >
            <Compass className="w-3.5 h-3.5" />
            Opportunities Board
          </Button>
          <Button
            variant={activeView === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveView("kanban")}
            className="text-[10px] font-black uppercase tracking-widest gap-1.5 h-8 px-3.5 rounded-lg"
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            Recruiting Pipeline
          </Button>
        </div>

        {activeView === "jobs" && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Filter company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-[11px] bg-transparent border-border rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Main View rendering */}
      {activeView === "jobs" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Opportunities list (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const hasApplied = appliedJobIds.has(job.id);
                // Smart matching algorithm based on completed courses
                const matchedCourse = completedCourses.find(c => 
                  job.requirements.toLowerCase().includes(c.name.toLowerCase()) ||
                  job.requirements.toLowerCase().includes(c.code.toLowerCase()) ||
                  job.description.toLowerCase().includes(c.name.toLowerCase()) ||
                  job.description.toLowerCase().includes(c.code.toLowerCase())
                );

                return (
                  <div 
                    key={job.id} 
                    onClick={() => {
                      setSelectedJob(job);
                      setMessage(null);
                      setResumeUrl("");
                    }}
                    className={`sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4 relative overflow-hidden transition-all duration-300 group hover:shadow-lg cursor-pointer border ${
                      isSelected ? "border-primary/70 shadow-md ring-1 ring-primary/25 bg-secondary/15" : "border-border/40"
                    }`}
                  >
                    <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl pointer-events-none bg-primary/5" />
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors leading-snug">
                            {job.title}
                          </h3>
                          {matchedCourse && (
                            <Badge variant="outline" className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 border-emerald-500/25 uppercase tracking-widest gap-1 py-0.5 px-2 rounded-full">
                              <Sparkles className="w-2.5 h-2.5 fill-emerald-400" /> Matches {matchedCourse.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-semibold">
                          {job.company} <span className="text-border font-normal">|</span> <span className="font-normal text-muted-foreground">{job.location}</span>
                        </p>
                      </div>

                      {hasApplied ? (
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-450 border border-emerald-500/25 py-1 px-2.5 rounded-lg">
                          ✓ Applied
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20 py-1 px-2.5 rounded-lg">
                          Open
                        </Badge>
                      )}
                    </div>

                    <p className="text-muted-foreground leading-relaxed text-[11px] line-clamp-2">{job.description}</p>

                    <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                      <span>Salary: <strong className="text-foreground font-bold">{job.salary || "Not Specified"}</strong></span>
                      <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Interactive Workspace <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-10 text-center text-muted-foreground text-xs">
                No active semiconductor opportunities match your search filter.
              </div>
            )}
          </div>

          {/* Quick Stats / Application form Workspace sidebar (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {selectedJob ? (
              (() => {
                const existingApp = applications.find(a => a.jobId === selectedJob.id);
                const hasApplied = !!existingApp;
                const matchedCourse = completedCourses.find(c => 
                  selectedJob.requirements.toLowerCase().includes(c.name.toLowerCase()) ||
                  selectedJob.requirements.toLowerCase().includes(c.code.toLowerCase())
                );

                return (
                  <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 shadow-xl border border-primary/30 relative">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-border/60 pb-3">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                          Job Workspace View
                        </span>
                        <h4 className="text-sm font-black text-foreground mt-1.5 leading-snug">{selectedJob.title}</h4>
                        <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{selectedJob.company} — {selectedJob.location}</p>
                      </div>
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedJob(null)}
                        className="text-muted-foreground hover:text-foreground text-xs font-black h-7 w-7 p-0 rounded-lg border border-border/50"
                      >
                        ✕
                      </Button>
                    </div>

                    {/* Messages */}
                    {message && (
                      <div className={`p-3.5 rounded-xl text-xs font-bold ${message.type === "success" ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/25" : "bg-rose-500/10 text-rose-400 border border-rose-500/25"}`}>
                        {message.text}
                      </div>
                    )}

                    {/* Details section */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-1">Description</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedJob.description}</p>
                      </div>

                      <div className="bg-muted/15 p-4 rounded-xl border border-border/40 space-y-1.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Technical Requirements</span>
                        <p className="text-foreground leading-relaxed text-[11px] font-medium">{selectedJob.requirements}</p>
                      </div>
                    </div>

                    {/* Interactive Pipeline State Portal */}
                    {hasApplied ? (
                      /* APPLICATION COMPLETED STATE PORTAL */
                      <div className="border-t border-border/60 pt-5 space-y-5">
                        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-450 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <h5 className="text-[11px] font-black text-emerald-450 uppercase tracking-wider">Application Complete & Secured</h5>
                            <p className="text-[10px] text-muted-foreground leading-normal">
                              Your academic credentials have been verified and physical profile was compiled successfully.
                            </p>
                          </div>
                        </div>

                        {/* Status tracker timeline */}
                        <div className="space-y-4">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Application Lifecycle Tracker</span>
                          <div className="relative pl-6 space-y-5 border-l border-border/60 ml-2.5">
                            {/* Step 1 */}
                            <div className="relative">
                              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white text-[8px] font-bold">
                                ✓
                              </div>
                              <h6 className="text-[11px] font-bold text-foreground">Application Transmitted</h6>
                              <p className="text-[9px] text-muted-foreground">Transmitted to CoE recruiters on {new Date(existingApp.createdAt).toLocaleDateString()}</p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative">
                              <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${
                                ["interviewing", "offered", "selected"].includes(existingApp.status)
                                  ? "bg-emerald-500 border-2 border-slate-900"
                                  : existingApp.status === "rejected"
                                    ? "bg-rose-500 border-2 border-slate-900"
                                    : "bg-primary animate-pulse border-2 border-slate-900"
                              }`}>
                                {["interviewing", "offered", "selected"].includes(existingApp.status) ? "✓" : existingApp.status === "rejected" ? "✕" : "2"}
                              </div>
                              <h6 className="text-[11px] font-bold text-foreground">Academic Verification</h6>
                              <p className="text-[9px] text-muted-foreground">
                                {existingApp.status === "rejected" 
                                  ? "Application archived by recruiter." 
                                  : ["interviewing", "offered", "selected"].includes(existingApp.status)
                                    ? "Resume & credentials verified."
                                    : "Recruiter is analyzing module performance records."}
                              </p>
                            </div>

                            {/* Step 3 */}
                            <div className="relative">
                              <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${
                                ["offered", "selected"].includes(existingApp.status)
                                  ? "bg-emerald-500 border-2 border-slate-900"
                                  : existingApp.status === "interviewing"
                                    ? "bg-primary animate-pulse border-2 border-slate-900"
                                    : "bg-secondary border border-border/80 text-muted-foreground"
                              }`}>
                                {["offered", "selected"].includes(existingApp.status) ? "✓" : "3"}
                              </div>
                              <h6 className="text-[11px] font-bold text-foreground">Interview Pipeline</h6>
                              <p className="text-[9px] text-muted-foreground">
                                {existingApp.status === "interviewing"
                                  ? "Active: Technical interview rounds scheduled."
                                  : ["offered", "selected"].includes(existingApp.status)
                                    ? "Interviews completed successfully."
                                    : "Subject to verification pass."}
                              </p>
                            </div>

                            {/* Step 4 */}
                            <div className="relative">
                              <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${
                                existingApp.status === "selected"
                                  ? "bg-emerald-500 border-2 border-slate-900"
                                  : existingApp.status === "offered"
                                    ? "bg-primary animate-pulse border-2 border-slate-900"
                                    : "bg-secondary border border-border/80 text-muted-foreground"
                              }`}>
                                {existingApp.status === "selected" ? "✓" : "4"}
                              </div>
                              <h6 className="text-[11px] font-bold text-foreground">Final Decision</h6>
                              <p className="text-[9px] text-muted-foreground">
                                {existingApp.status === "selected"
                                  ? "Offer signed! Onboarding started."
                                  : existingApp.status === "offered"
                                    ? "Offer extended! Pending candidate review."
                                    : "Hiring decision outcome."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Submitted Resume Info */}
                        <div className="p-3 bg-secondary/15 border border-border/50 rounded-xl flex justify-between items-center text-[10px]">
                          <span className="font-mono text-muted-foreground truncate max-w-[200px]">Resume: {existingApp.resumeUrl}</span>
                          <a 
                            href={existingApp.resumeUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-primary hover:underline font-bold shrink-0 ml-2"
                          >
                            Open Link
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* ACTIVE APPLICATION WORKFLOW */
                      <form onSubmit={onApply} className="border-t border-border/60 pt-5 space-y-4">
                        {/* Course Match verification check */}
                        <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                          matchedCourse 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450" 
                            : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        }`}>
                          <Sparkles className="w-4 h-4 shrink-0" />
                          <div className="text-[10px] leading-normal font-semibold">
                            {matchedCourse ? (
                              <span>Verified: You completed <strong className="font-bold">{matchedCourse.code}</strong>. You meet requirements.</span>
                            ) : (
                              <span>No directly matching course in your profile. You may still apply.</span>
                            )}
                          </div>
                        </div>

                        {/* Resume field */}
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Resume URL Link *</Label>
                          <Input
                            type="url"
                            placeholder="https://drive.google.com/file/d/..."
                            value={resumeUrl}
                            onChange={(e) => setResumeUrl(e.target.value)}
                            required
                            className="h-10 text-xs bg-transparent border-border rounded-lg"
                          />
                          <span className="text-[9px] text-muted-foreground block leading-normal">
                            Provide a viewable PDF link from Google Drive or OneDrive.
                          </span>
                        </div>

                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full h-10 text-xs font-black uppercase tracking-widest rounded-lg shadow-md mt-2"
                        >
                          {submitting ? "Transmitting application..." : "Transmit Application"}
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })()
            ) : (
              /* No job selected placeholder state */
              <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-10 text-center text-muted-foreground text-xs flex flex-col items-center justify-center space-y-3 min-h-[320px]">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center animate-bounce">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <p className="max-w-xs leading-relaxed font-semibold">
                  Select an opportunity from the board to view full technical requirements, curriculum verification checklist, and track your application status timeline.
                </p>
              </div>
            )}

            {/* Quick Applications Tracker */}
            <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border/50 pb-2.5 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" /> Active Submissions
              </h4>
              <div className="space-y-3">
                {applications.length > 0 ? (
                  applications.slice(0, 4).map((app) => (
                    <div 
                      key={app.id} 
                      onClick={() => {
                        const job = jobs.find(j => j.id === app.jobId);
                        if (job) setSelectedJob(job);
                      }}
                      className="bg-muted/15 border border-border/40 p-3.5 rounded-xl space-y-2 hover:bg-muted/20 transition-all cursor-pointer hover:border-primary/30"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-extrabold text-foreground text-xs leading-snug truncate">{app.job.title}</h5>
                          <p className="text-[10px] text-muted-foreground font-semibold truncate">{app.job.company}</p>
                        </div>
                        <Badge variant="outline" className={`text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${getStatusColor(app.status)}`}>
                          {app.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No applications yet.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="flex flex-row overflow-x-auto lg:grid lg:grid-cols-5 gap-4 pb-4 scrollbar-thin">
          {kanbanStages.map((stage) => {
            const stageApps = applications.filter(app => app.status === stage);
            return (
              <div 
                key={stage} 
                className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-4 flex flex-col w-72 shrink-0 lg:w-auto lg:shrink shadow-sm"
              >
                <div className="flex flex-col space-y-4 flex-1">
                  {/* Column header */}
                  <div className="flex justify-between items-center border-b border-border/45 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                      {stageLabels[stage]}
                    </span>
                    <Badge variant="secondary" className="text-[9px] font-black h-5 px-2.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                      {stageApps.length}
                    </Badge>
                  </div>

                  {/* Column Cards list */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[300px] scrollbar-none">
                    {stageApps.length > 0 ? (
                      stageApps.map((app) => (
                        <div 
                          key={app.id} 
                          className="bg-background/40 border border-border/65 p-3.5 rounded-xl space-y-2 hover:border-primary/45 transition-all cursor-grab group active:cursor-grabbing hover:shadow-md"
                        >
                          <div className="space-y-0.5">
                            <h5 className="font-extrabold text-foreground text-xs leading-tight group-hover:text-primary transition-colors">
                              {app.job.title}
                            </h5>
                            <p className="text-[10px] text-muted-foreground font-semibold">{app.job.company}</p>
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-2 border-t border-border/40 font-semibold">
                            <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                            <a 
                              href={app.resumeUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-primary hover:underline flex items-center gap-0.5"
                            >
                              Resume <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center border border-dashed border-border/60 rounded-xl py-12 text-[10px] text-muted-foreground text-center">
                        No applications
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
