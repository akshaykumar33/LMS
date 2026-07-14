"use client";

import React, { useState } from "react";
import { createJobPostingAction, updateJobPostingAction, deleteJobPostingAction, updateApplicationStatusAction } from "../actions/career-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface JobPosting {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  salary: string;
  location: string;
  isActive: boolean;
  createdAt: Date | string;
}

interface Applicant {
  applicationId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  rollNumber: string;
  resumeUrl: string;
  status: string;
  appliedAt: Date | string;
}

interface PlacementConsoleProps {
  jobs: JobPosting[];
  applicantsMap: Record<string, Applicant[]>;
  userRole?: string;
}

export function PlacementConsole({ jobs, applicantsMap, userRole }: PlacementConsoleProps) {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id || null);
  
  // Create Job form states
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit Job form states
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editLocation, setEditLocation] = useState("");

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company || !description || !requirements || !location) {
      setFormMsg({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setLoading(true);
    setFormMsg(null);

    try {
      const res = await createJobPostingAction({
        title,
        company,
        description,
        requirements,
        salary: salary || undefined,
        location,
      });

      if (res.success) {
        setFormMsg({ type: "success", text: "Job posting created successfully!" });
        setTitle("");
        setCompany("");
        setDescription("");
        setRequirements("");
        setSalary("");
        setLocation("");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setFormMsg({ type: "error", text: res.error || "Failed to create job posting." });
      }
    } catch (err: any) {
      setFormMsg({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    setLoading(true);
    try {
      const res = await updateJobPostingAction(editingJob.id, {
        title: editTitle,
        company: editCompany,
        description: editDescription,
        requirements: editRequirements,
        salary: editSalary || null,
        location: editLocation,
      });
      console.log("updateJobPostingAction result", res);

      if (res.success) {
        setEditingJob(null);
        window.location.reload();
      } else {
        alert(res.error || "Failed to update job posting.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job posting? This cannot be undone.")) return;

    try {
      const res = await deleteJobPostingAction(jobId);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error || "Failed to delete job posting.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    }
  };

  const handleStatusUpdate = async (appId: string, nextStatus: string) => {
    setUpdatingId(appId);
    try {
      const res = await updateApplicationStatusAction(appId, nextStatus);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error || "Failed to update status.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setUpdatingId(null);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const selectedApplicants = selectedJobId ? applicantsMap[selectedJobId] || [] : [];

  // Applicant filter states
  const [appSearch, setAppSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredApplicants = selectedApplicants.filter((app) => {
    const fullName = `${app.firstName} ${app.lastName || ""}`.toLowerCase();
    const query = appSearch.toLowerCase();
    const matchesSearch = fullName.includes(query) || 
      app.rollNumber.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "offered":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "selected":
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case "interviewing":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "offered") return "Offer Released";
    return status;
  };

  return (
    <div className="space-y-6 text-xs text-foreground font-sans">
      {/* Tab Nav */}
      <div className="flex gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === "list" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("list")}
          className="text-[10px] font-black uppercase tracking-widest gap-1.5 h-8 px-4 rounded-lg"
        >
          💼 Active Openings & Applicants
        </Button>
        <Button
          variant={activeTab === "create" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("create")}
          className="text-[10px] font-black uppercase tracking-widest gap-1.5 h-8 px-4 rounded-lg"
        >
          ➕ Post a New Job
        </Button>
      </div>

      {activeTab === "list" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Jobs List (4 cols) */}
          <div className="lg:col-span-4">
            <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-4 space-y-4">
              <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/60 pb-2">
                Job Listings
              </h3>
              <div className="space-y-2">
                {jobs.length > 0 ? (
                  jobs.map((job) => {
                    const isSel = selectedJobId === job.id;
                    return (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full text-left p-3.5 rounded-xl border flex flex-col items-start gap-1 transition-all hover:scale-[1.01] ${
                          isSel
                            ? "border-primary bg-secondary/30 shadow-md"
                            : "border-border/40 hover:border-border/80 bg-transparent"
                        }`}
                      >
                        <h4 className="font-extrabold text-foreground text-xs leading-snug">{job.title}</h4>
                        <p className="text-[10px] text-muted-foreground font-semibold">{job.company}</p>
                        <p className="text-[9px] text-slate-400 font-normal">{job.location}</p>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-muted-foreground bg-muted/10 border border-border/40 rounded-xl text-[11px]">
                    No job openings active.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Job details & Candidates list (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedJob ? (
              <div className="space-y-6">
                {/* Details Panel */}
                <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-4 relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl bg-primary/5 pointer-events-none" />
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-extrabold text-foreground leading-tight">{selectedJob.title}</h2>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {selectedJob.company} <span className="text-border">|</span> <span className="font-normal text-muted-foreground">{selectedJob.location}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={userRole === "Guest"}
                        onClick={() => {
                          setEditingJob(selectedJob);
                          setEditTitle(selectedJob.title);
                          setEditCompany(selectedJob.company);
                          setEditDescription(selectedJob.description);
                          setEditRequirements(selectedJob.requirements);
                          setEditSalary(selectedJob.salary ?? "");
                          setEditLocation(selectedJob.location);
                        }}
                        className="h-8 text-[10px] font-black uppercase tracking-widest px-3 rounded-lg"
                      >
                        {userRole === "Guest" ? "Read Only" : "Edit Job"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={userRole === "Guest"}
                        onClick={() => handleDeleteJob(selectedJob.id)}
                        className="h-8 text-[10px] font-black uppercase tracking-widest px-3 rounded-lg border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <p className="text-muted-foreground leading-relaxed text-[11px] font-medium">{selectedJob.description}</p>
                  
                  <div className="space-y-1.5 bg-muted/15 p-4 rounded-xl border border-border/40">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block">Candidate Requirements</span>
                    <p className="text-muted-foreground font-medium leading-relaxed text-[11px]">{selectedJob.requirements}</p>
                  </div>
                </div>

                {/* Applicants Section */}
                <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                      Applications ({selectedApplicants.length})
                    </h3>

                    {/* Filter Inputs bar */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search box */}
                      <div className="relative w-full sm:w-48">
                        <input
                          type="text"
                          placeholder="Search candidates..."
                          value={appSearch}
                          onChange={(e) => setAppSearch(e.target.value)}
                          className="w-full h-8 pl-3 pr-3 text-[10px] bg-muted/20 border border-border/60 rounded-lg focus:outline-none focus:border-primary/50 text-foreground"
                        />
                      </div>
                      
                      {/* Stage dropdown */}
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-8 bg-card border border-border/60 rounded-lg text-[10px] text-muted-foreground px-2 focus:outline-none focus:border-primary/50"
                      >
                        <option value="all">All Stages</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offered">Offer Released</option>
                        <option value="selected">Selected</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {filteredApplicants.length > 0 ? (
                    <div className="overflow-x-auto scrollbar-thin border border-border/40 rounded-xl">
                      <table className="w-full text-left min-w-[700px]">
                        <thead>
                          <tr className="bg-muted/15 text-muted-foreground border-b border-border/40 text-[9px] font-bold uppercase tracking-widest">
                            <th className="p-3.5">Student</th>
                            <th className="p-3.5">Roll No</th>
                            <th className="p-3.5">Resume</th>
                            <th className="p-3.5">Stage</th>
                            <th className="p-3.5 text-right">Transition Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredApplicants.map((app) => {
                            const initials = ((app.firstName?.[0] || "") + (app.lastName?.[0] || "")).toUpperCase() || "ST";
                            return (
                              <tr key={app.applicationId} className="border-b border-border/45 hover:bg-muted/10 transition-colors">
                                <td className="p-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-[9px]">
                                      {initials}
                                    </div>
                                    <span className="font-extrabold text-slate-200 text-[11px]">{app.firstName} {app.lastName}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 font-mono text-[11px] text-muted-foreground">{app.rollNumber}</td>
                                <td className="p-3.5">
                                  <a
                                    href={app.resumeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-black text-[11px] flex items-center gap-0.5"
                                  >
                                    View Resume &rarr;
                                  </a>
                                </td>
                                <td className="p-3.5">
                                  <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${getStatusColor(app.status)}`}>
                                    {getStatusLabel(app.status)}
                                  </Badge>
                                </td>
                                <td className="p-3.5 text-right">
                                  {updatingId === app.applicationId ? (
                                    <span className="text-muted-foreground font-semibold">Saving...</span>
                                  ) : (
                                    <div className="inline-block relative">
                                      <Select
                                        value={app.status}
                                        disabled={userRole === "Guest"}
                                        onValueChange={(val) => handleStatusUpdate(app.applicationId, val)}
                                      >
                                        <SelectTrigger className="h-7 w-auto text-[10px] bg-transparent border-border rounded-lg text-slate-200 font-bold px-2">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                          <SelectItem value="applied" className="text-xs">Applied</SelectItem>
                                          <SelectItem value="interviewing" className="text-xs">Interviewing</SelectItem>
                                          <SelectItem value="offered" className="text-xs">Offer Released</SelectItem>
                                          <SelectItem value="selected" className="text-xs">Selected</SelectItem>
                                          <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground bg-muted/10 border border-border/40 rounded-xl text-[11px]">
                      No active applicants match the filters.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-12 text-center text-muted-foreground text-[11px]">
                Please select a job opening to view applicants and details.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Create Form Tab */
        <form onSubmit={handleCreateJob}>
          <Card className="border-border max-w-xl shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-foreground mb-2">➕ Post a New Opportunity</h3>

              {formMsg && (
                <div className={`p-3.5 rounded-lg text-xs font-semibold ${formMsg.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  {formMsg.text}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold uppercase tracking-wider">Job Title *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Physical Design Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold uppercase tracking-wider">Company Name *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Intel Corporation"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold uppercase tracking-wider">Location *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Hsinchu, Taiwan / Remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold uppercase tracking-wider">Estimated Salary</Label>
                  <Input
                    type="text"
                    placeholder="e.g. $120,000 - $140,000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold uppercase tracking-wider">Job Description *</Label>
                <textarea
                  placeholder="Provide a comprehensive description of the role, responsibilities, and team scope."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent border border-input rounded-lg p-2.5 text-xs text-foreground resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold uppercase tracking-wider">Requirements *</Label>
                <textarea
                  placeholder="List required technical skills (e.g. SystemVerilog, UVM, DRC/LVS, FinFET fabrication)."
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent border border-input rounded-lg p-2.5 text-xs text-foreground resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || userRole === "Guest"}
                className="w-full h-10 text-xs font-bold shadow-md"
              >
                {loading ? "Creating..." : userRole === "Guest" ? "Read Only" : "Create Job Posting"}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {editingJob && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateJob}
            className="bg-slate-950 border border-border p-6 rounded-2xl max-w-lg w-full space-y-4 text-foreground shadow-2xl"
          >
            <h3 className="text-sm font-bold text-white mb-2">💼 Edit Job Posting</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="block text-muted-foreground font-bold uppercase tracking-wider">Job Title</Label>
                <Input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-10 text-xs text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="block text-muted-foreground font-bold uppercase tracking-wider">Company Name</Label>
                <Input
                  type="text"
                  required
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="h-10 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="block text-muted-foreground font-bold uppercase tracking-wider">Location</Label>
                <Input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="h-10 text-xs text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="block text-muted-foreground font-bold uppercase tracking-wider">Estimated Salary</Label>
                <Input
                  type="text"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  className="h-10 text-xs text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="block text-muted-foreground font-bold uppercase tracking-wider">Job Description</Label>
              <textarea
                required
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-transparent border border-input rounded-lg p-2.5 text-xs text-white resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="block text-muted-foreground font-bold uppercase tracking-wider">Requirements</Label>
              <textarea
                required
                rows={3}
                value={editRequirements}
                onChange={(e) => setEditRequirements(e.target.value)}
                className="w-full bg-transparent border border-input rounded-lg p-2.5 text-xs text-white resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingJob(null)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="text-xs font-bold"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
