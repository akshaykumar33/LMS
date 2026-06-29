"use client";

import React, { useState } from "react";
import { approveApplicationAction, rejectApplicationAction, getApplicationDetailsAction } from "../actions/admission-actions";
import { GuestSandboxBanner } from "@/components/GuestSandboxBanner";
import { LogOut, Search, Filter, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { NotificationBell } from "@/features/notification/components/NotificationBell";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: Date;
  batch: {
    id: string;
    name: string;
  };
  payments: {
    id: string;
    amount: string;
    status: string;
    paymentMethod: string;
    transactionId: string | null;
  }[];
}

interface AdmissionsDashboardProps {
  initialApplications: Application[];
  batches: { id: string; name: string }[];
  primaryColor?: string;
  logoutHandler: () => Promise<void>;
  userRole?: string;
  tenantSubdomain?: string;
}

export function AdmissionsDashboard({ 
  initialApplications, 
  batches, 
  primaryColor, 
  logoutHandler, 
  userRole,
  tenantSubdomain
}: AdmissionsDashboardProps) {
  // States
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState<any | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Stats
  const totalCount = initialApplications.length;
  const pendingCount = initialApplications.filter(a => a.status === "pending" || a.status === "under_review").length;
  const approvedCount = initialApplications.filter(a => a.status === "approved").length;
  const rejectedCount = initialApplications.filter(a => a.status === "rejected").length;

  // Filter logic
  const filteredApps = applications.filter((app) => {
    const matchesStatus = filterStatus === "all" || app.status === filterStatus;
    const matchesBatch = filterBatch === "all" || app.batch.id === filterBatch;
    const matchesSearch = 
      app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesBatch && matchesSearch;
  });

  const handleRowClick = async (appId: string) => {
    setActionLoading(true);
    setEnrollmentResult(null);
    try {
      const result = await getApplicationDetailsAction(appId);
      if (result.success) {
        setSelectedApp(result.data);
      }
    } catch (err) {
      alert("Failed to load application details.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    setErrorState(null);

    try {
      const result = await approveApplicationAction(selectedApp.id);
      if (result.success) {
        setEnrollmentResult(result);
        // Update local list
        setApplications(apps => 
          apps.map(a => a.id === selectedApp.id ? { ...a, status: "approved" } : a)
        );
      } else {
        setErrorState(result.error || "Approval failed.");
      }
    } catch (err: any) {
      setErrorState(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    if (!confirm("Are you sure you want to reject this application?")) return;
    setActionLoading(true);

    try {
      const result = await rejectApplicationAction(selectedApp.id);
      if (result.success) {
        setApplications(apps => 
          apps.map(a => a.id === selectedApp.id ? { ...a, status: "rejected" } : a)
        );
        setSelectedApp(null);
      } else {
        alert(result.error || "Rejection failed.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const brandColor = primaryColor || "#0ea5e9";

  return (
    <div className="space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[
            { label: "Total Applications", value: totalCount, glowColor: brandColor, color: "text-foreground" },
            { label: "Review Pending", value: pendingCount, glowColor: "#fbbf24", color: "text-amber-400" },
            { label: "Enrolled Students", value: approvedCount, glowColor: "#10b981", color: "text-emerald-400" },
            { label: "Rejected Candidates", value: rejectedCount, glowColor: "#ef4444", color: "text-destructive" },
          ].map((stat, i) => (
            <div key={i} className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 relative overflow-hidden transition-all duration-300">
              <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full blur-2xl pointer-events-none" style={{ background: `radial-gradient(circle, ${stat.glowColor}10, transparent)` }} />
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-black mt-2 tracking-tight ${stat.color}`} style={{ textShadow: `0 0 12px ${stat.glowColor}15` }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters and Controls */}
        <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1 bg-background/50 p-1 rounded-xl w-full md:w-auto border border-border">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "under_review", label: "Under Review" },
              { id: "payment_pending", label: "Payment Pending" },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Rejected" },
            ].map((tab) => {
              const isSel = filterStatus === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isSel ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg ${
                    isSel ? "shadow bg-card" : ""
                  }`}
                  style={isSel ? { color: brandColor } : undefined}
                >
                  {tab.label}
                </Button>
              );
            })}
          </div>

          <div className="flex gap-3 w-full md:w-auto shrink-0 items-center">
            {/* Batch filter */}
            <Select value={filterBatch} onValueChange={setFilterBatch}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs bg-transparent border-border">
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-slate-800 text-white">
                <SelectItem value="all" className="text-xs">All Batches</SelectItem>
                {batches.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search applicant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs w-full md:w-48 bg-transparent border-border"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="py-4 px-6">Applicant Name</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Cohort Batch</th>
                  <th className="py-4 px-6">Applied Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredApps.length > 0 ? (
                  filteredApps.map((app) => (
                    <tr 
                      key={app.id} 
                      className="hover:bg-primary/5 cursor-pointer transition-colors group"
                      onClick={() => handleRowClick(app.id)}
                    >
                      <td className="py-4 px-6 font-bold text-foreground flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/15 transition-all group-hover:scale-105 group-hover:bg-primary group-hover:text-white" style={{ borderColor: `${brandColor}30` }}>
                          {app.firstName.charAt(0)}{app.lastName?.charAt(0) || ""}
                        </div>
                        <span className="group-hover:text-primary transition-colors">{app.firstName} {app.lastName}</span>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">{app.email}</td>
                      <td className="py-4 px-6 font-semibold text-foreground">{app.batch.name}</td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                          app.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          app.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          app.status === "under_review" ? "bg-primary/10 text-primary border-primary/20" :
                          app.status === "payment_pending" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          "bg-secondary/40 text-muted-foreground border-border"
                        }`}>
                          {app.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRowClick(app.id)}
                          className="text-xs font-bold transition-all hover:underline cursor-pointer"
                          style={{ color: brandColor }}
                        >
                          Review File &rarr;
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No applications found matching the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Review Modal Side-Drawer using shadcn Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl h-[90vh] shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between border-l border-border rounded-xl" showCloseButton={false}>
          {selectedApp && (
            <>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-foreground">
                      {selectedApp.firstName} {selectedApp.lastName}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">{selectedApp.email} | {selectedApp.phone || "No phone input"}</p>
                  </div>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Status Banner */}
                <div className="flex items-center justify-between bg-background/50 p-4 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Application Status</span>
                  <span className="text-xs font-black uppercase" style={{ color: brandColor }}>
                    {selectedApp.status.replace("_", " ")}
                  </span>
                </div>

                {errorState && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-semibold">
                    {errorState}
                  </div>
                )}

                {/* Enrollment Credentials Notification */}
                {enrollmentResult && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-2 text-xs text-emerald-455">
                    <p className="font-extrabold text-[13px]">✅ Account Provisioned Successfully!</p>
                    <p className="text-[11px] text-muted-foreground">Student credentials saved to database:</p>
                    <ul className="list-disc pl-4 space-y-1.5 mt-1 font-mono text-[11px] text-muted-foreground">
                      <li>Roll: {enrollmentResult.student?.rollNumber}</li>
                      <li>Admission ID: {enrollmentResult.student?.admissionNumber}</li>
                      <li>Email: {selectedApp.email}</li>
                      <li>Temporary Password: <span className="bg-background px-1 py-0.5 rounded text-foreground font-semibold">{enrollmentResult.temporaryPassword}</span></li>
                    </ul>
                  </div>
                )}

                {/* Academic History */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Academic History</h4>
                  <div className="grid grid-cols-2 gap-4 text-[11px] leading-relaxed">
                    <div>
                      <span className="text-muted-foreground">Degree Target:</span>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApp.batch?.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Highest Education:</span>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApp.academicHistory?.highestDegree}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">College / Institution:</span>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApp.academicHistory?.institution}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GPA / CGPA:</span>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApp.academicHistory?.gpaOrPercentage}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Graduation Year:</span>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApp.academicHistory?.graduationYear}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Relevant Experience:</span>
                      <p className="font-semibold text-foreground mt-0.5">{selectedApp.academicHistory?.experienceMonths} Months</p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Uploaded Transcripts</h4>
                  {selectedApp.documents?.length > 0 ? (
                    selectedApp.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border border-border bg-background/20 rounded-xl text-xs">
                         <div>
                          <p className="font-bold text-foreground">{doc.documentName}</p>
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:underline font-semibold mt-1 inline-block"
                            style={{ color: brandColor }}
                          >
                            View File Link &rarr;
                          </a>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          doc.status === "verified" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No transcripts submitted.</p>
                  )}
                </div>

                {/* Payments */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Admissions Payment Details</h4>
                  {selectedApp.payments?.length > 0 ? (
                    selectedApp.payments.map((pay: any) => (
                      <div key={pay.id} className="flex items-center justify-between p-3 border border-border rounded-xl text-xs bg-surface">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">Amount: ${pay.amount}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">Method: {pay.paymentMethod.toUpperCase()} | Transaction: {pay.transactionId || "Pending"}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          pay.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {pay.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No transaction records found.</p>
                  )}
                </div>
              </div>

              {/* Modal Actions Footer */}
              {selectedApp.status !== "approved" && selectedApp.status !== "rejected" && (
                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border mt-6 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="h-10 text-xs font-bold border-red-500/30 text-red-400 hover:bg-red-950/20"
                  >
                    Reject Candidate
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="h-10 text-xs font-bold shadow-md"
                    style={{ backgroundColor: brandColor, color: "#fff" }}
                  >
                    {actionLoading ? "Processing..." : "Approve & Enroll"}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
