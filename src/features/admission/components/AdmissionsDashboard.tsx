"use client";

import React, { useState } from "react";
import { useAdmissionsStore } from "@/store";
import { approveApplicationAction, rejectApplicationAction, getApplicationDetailsAction, updateTenantPaymentSettingsAction, updateDocumentStatusAction, manualSignUpStudentAction } from "../actions/admission-actions";
import { StudentImportModal } from "./StudentImportModal";
import { formatReadableDate } from "@/utils/date-formatter";
import { GuestSandboxBanner } from "@/components/GuestSandboxBanner";
import { LogOut, Search, Filter, X, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { NotificationBell } from "@/features/notification/components/NotificationBell";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  isEnrolled?: boolean;
  academicHistory?: any;
  documents?: any[];
}

interface AdmissionsDashboardProps {
  initialApplications: Application[];
  batches: { id: string; name: string }[];
  courses?: { id: string; name: string; code: string }[];
  primaryColor?: string;
  logoutHandler: () => Promise<void>;
  userRole?: string;
  tenantSubdomain?: string;
  initialSettings?: {
    paymentRequired?: boolean;
    tuitionFee?: string;
    gateways?: {
      stripe: boolean;
      razorpay: boolean;
      paypal: boolean;
    };
  } | null;
}

export function AdmissionsDashboard({ 
  initialApplications, 
  batches, 
  courses = [],
  primaryColor, 
  logoutHandler, 
  userRole,
  tenantSubdomain,
  initialSettings
}: AdmissionsDashboardProps) {
  const {
    applications, setApplications,
    selectedApp, setSelectedApp,
    filterStatus, setFilterStatus,
    filterBatch, setFilterBatch,
    searchTerm, setSearchTerm,
    actionLoading, setActionLoading,
    enrollmentResult, setEnrollmentResult,
    errorState, setErrorState,
    updateApplicationStatus,
    clearSelection,
    filteredApplications,
  } = useAdmissionsStore();

  const [settingsPayRequired, setSettingsPayRequired] = useState(initialSettings?.paymentRequired !== false);
  const [settingsFee, setSettingsFee] = useState(initialSettings?.tuitionFee || "1500.00");
  const [settingsGateways, setSettingsGateways] = useState(initialSettings?.gateways || { stripe: true, razorpay: true, paypal: true });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Manual signup states
  const [manualPassword, setManualPassword] = useState("Password123");
  const [manualSignupSuccess, setManualSignupSuccess] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [docToRejectId, setDocToRejectId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState("");
  const [showDocRejectModal, setShowDocRejectModal] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);
    setErrorState(null);

    try {
      const res = await updateTenantPaymentSettingsAction({
        tuitionFee: settingsFee,
        paymentRequired: settingsPayRequired,
        gateways: settingsGateways,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorState(res.error || "Failed to update payment settings.");
      }
    } catch (err: any) {
      setErrorState(err.message || "An unexpected error occurred.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Hydrate store with server-provided data on mount
  React.useEffect(() => {
    setApplications(initialApplications as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stats — computed from the live store list
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === "pending" || a.status === "under_review").length;
  const approvedCount = applications.filter(a => a.status === "approved").length;
  const rejectedCount = applications.filter(a => a.status === "rejected").length;

  // Filtered list via store derived selector
  const filteredApps = filteredApplications();

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

  const handleUpdateDocStatus = async (docId: string, status: "verified" | "rejected", reasonText?: string) => {
    const reason = reasonText || "";
    if (status === "rejected" && !reason.trim()) {
      setErrorState("Rejection reason is required.");
      return;
    }

    setActionLoading(true);
    setErrorState(null);
    try {
      const res = await updateDocumentStatusAction(docId, status, reason);
      if (res.success) {
        if (selectedApp) {
          setSelectedApp({
            ...selectedApp,
            documents: (selectedApp.documents || []).map((d: any) =>
              d.id === docId ? { ...d, status } : d
            ),
          });
        }
      } else {
        setErrorState(res.error || "Failed to update document status.");
      }
    } catch (err: any) {
      setErrorState(err.message || "An unexpected error occurred.");
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
        updateApplicationStatus(selectedApp.id, "approved");
        setSelectedApp({
          ...selectedApp,
          status: "approved",
        } as any);
      } else {
        setErrorState(result.error || "Approval failed.");
      }
    } catch (err: any) {
      setErrorState(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualSignUp = async () => {
    if (!selectedApp) return;
    if (!manualPassword.trim()) {
      setErrorState("Please enter a password.");
      return;
    }
    setActionLoading(true);
    setErrorState(null);

    try {
      const result = await manualSignUpStudentAction(selectedApp.id, manualPassword);
      if (result.success) {
        setEnrollmentResult(result);
        setManualSignupSuccess(true);
        setSelectedApp({
          ...selectedApp,
          isEnrolled: true,
        } as any);
        updateApplicationStatus(selectedApp.id, "approved");
      } else {
        setErrorState(result.error || "Manual signup failed.");
      }
    } catch (err: any) {
      setErrorState(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    setShowRejectConfirm(false);
    setErrorState(null);

    try {
      const result = await rejectApplicationAction(selectedApp.id);
      if (result.success) {
        updateApplicationStatus(selectedApp.id, "rejected");
        clearSelection();
      } else {
        setErrorState(result.error || "Rejection failed.");
      }
    } catch (err: any) {
      setErrorState(err.message || "An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const brandColor = primaryColor || "#0ea5e9";

  return (
    <div className="space-y-6">
        {/* Header with Title and Scroll Link */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Admissions Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Review and approve applicant submissions, manage student cohorts, and configure payment controls.
            </p>
          </div>

          {(userRole === "Owner" || userRole === "Admin" || userRole === "SuperAdmin") && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex h-9 items-center justify-center rounded-xl text-white px-4 text-xs font-bold hover:opacity-90 cursor-pointer shadow-sm transition-all"
                style={{ backgroundColor: brandColor }}
              >
                📥 Bulk Import Students
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("payment-settings-panel");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-card border border-border px-4 text-xs font-bold text-foreground hover:bg-muted/50 cursor-pointer shadow-sm transition-all"
              >
                ⚙️ Payment Settings
              </button>
            </div>
          )}
        </div>
        
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

        {/* Payment Configuration Card */}
        {(userRole === "Owner" || userRole === "Admin" || userRole === "SuperAdmin") && (
          <div id="payment-settings-panel" className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-border/40 space-y-5">
            <div className="space-y-1.5 border-b border-border pb-3">
              <span className="text-[9px] font-black text-primary tracking-widest uppercase" style={{ color: brandColor }}>
                Domain Administration
              </span>
              <h3 className="text-base font-extrabold text-foreground">💳 Domain Payment Configuration</h3>
              <p className="text-xs text-muted-foreground">
                Control tuition fees, payment requirements, and active gateway integrations for self-signup admissions.
              </p>
            </div>

            {saveSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-400 font-semibold flex items-center gap-2 animate-in fade-in">
                <span>✓</span> Settings updated successfully! Active checkouts will immediately reflect these changes.
              </div>
            )}

            {errorState && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-450 font-semibold flex items-center gap-2 animate-in fade-in">
                <span>⚠</span> {errorState}
              </div>
            )}

            <form onSubmit={handleSavePaymentSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 border border-border bg-background/25 rounded-xl">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-foreground block cursor-pointer" htmlFor="require-payment-toggle">
                      Require Admission Payment
                    </label>
                    <span className="text-[10px] text-muted-foreground block">
                      Enforce tuition fee checkout for new students during self-signup.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="require-payment-toggle"
                    checked={settingsPayRequired}
                    onChange={(e) => setSettingsPayRequired(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                    style={{ '--c': brandColor } as any}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    Program Tuition Fee ($ USD)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1500.00"
                    value={settingsFee}
                    onChange={(e) => setSettingsFee(e.target.value)}
                    disabled={!settingsPayRequired}
                    className="h-10 text-xs bg-transparent border-border"
                  />
                  <p className="text-[10px] text-muted-foreground font-medium">
                    This amount is charged dynamically at checkout. Set to 0.00 to disable payment requirement.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-foreground block">
                    Active Payment Gateways
                  </label>
                  <p className="text-[10px] text-muted-foreground block -mt-1.5">
                    Select which payment channels are visible and enabled for student enrollment.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: "stripe", label: "Stripe Credit Card Processing" },
                      { id: "razorpay", label: "Razorpay UPI Sandbox" },
                      { id: "paypal", label: "PayPal Sandbox Wallet" },
                    ].map((gateway) => (
                      <div key={gateway.id} className="flex items-center justify-between p-2.5 border border-border/60 bg-background/15 rounded-lg">
                        <span className="text-xs font-semibold text-muted-foreground">{gateway.label}</span>
                        <input
                          type="checkbox"
                          checked={(settingsGateways as any)[gateway.id]}
                          disabled={!settingsPayRequired}
                          onChange={(e) => setSettingsGateways({
                            ...settingsGateways,
                            [gateway.id]: e.target.checked
                          })}
                          className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                          style={{ '--c': brandColor } as any}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={saveLoading || (userRole as string) === "Guest"}
                    className="h-10 px-6 font-bold text-white shadow-md rounded-xl transition-all cursor-pointer"
                    style={{ backgroundColor: brandColor }}
                  >
                    {saveLoading ? "Saving Settings..." : (userRole as string) === "Guest" ? "Read Only" : "Save Configuration"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

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
                      <td className="py-4 px-6 font-semibold text-foreground">
                        <div>{app.batch.name}</div>
                        {(app.batch as any).status && (
                          <span className={`inline-flex items-center text-[8.5px] font-black uppercase px-1 rounded bg-secondary text-muted-foreground mt-1`}>
                            {(app.batch as any).status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {formatReadableDate(app.createdAt)}
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
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && clearSelection()}>
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
                    onClick={() => clearSelection()}
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
                  {(selectedApp.documents?.length ?? 0) > 0 ? (
                    selectedApp.documents!.map((doc: any) => (
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
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            doc.status === "verified" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            doc.status === "rejected" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                            "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {doc.status}
                          </span>
                          {doc.status !== "verified" && doc.status !== "rejected" && userRole !== "Guest" && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleUpdateDocStatus(doc.id, "verified")}
                                className="px-2 py-1 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => {
                                  setDocToRejectId(doc.id);
                                  setRejectReasonText("");
                                  setShowDocRejectModal(true);
                                }}
                                className="px-2 py-1 text-[9px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No transcripts submitted.</p>
                  )}
                </div>

                {/* Payments */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">Admissions Payment Details</h4>
                  {/* Commented out payment details tracking for manual phase
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
                  */}
                  <div className="p-3 border border-dashed border-amber-500/20 bg-amber-500/5 rounded-xl text-xs text-muted-foreground flex flex-col gap-1">
                    <p className="font-extrabold text-[10px] text-amber-500 uppercase tracking-wider">Manual Phase Enabled</p>
                    <p className="text-[10px]">Admission applications do not require online checkouts in this phase.</p>
                  </div>
                </div>
              </div>

              {/* Manual Student Sign Up Section */}
              {selectedApp.status === "approved" && (
                <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-xl mt-4 shrink-0">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary" style={{ color: brandColor }}>
                    🔑 Manual Student Account Provisioning (Sign Up)
                  </h4>
                  {(selectedApp as any).isEnrolled ? (
                    <div className="text-xs space-y-1">
                      <p className="text-emerald-500 font-bold">✓ Student account has been provisioned.</p>
                      <p className="text-muted-foreground text-[10px]">Credentials have been shared manually or via email notification.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        This application is approved. Set a custom password below to manually create the student profile and user credentials.
                      </p>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="manual-password-input">
                          Set Student Password
                        </Label>
                        <Input
                          id="manual-password-input"
                          type="text"
                          placeholder="Password123"
                          value={manualPassword}
                          onChange={(e) => setManualPassword(e.target.value)}
                          className="h-9 text-xs bg-background"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleManualSignUp}
                        disabled={actionLoading || (userRole as string) === "Guest"}
                        className="w-full h-9 text-xs font-bold shadow-md cursor-pointer"
                        style={{ backgroundColor: brandColor, color: "#fff" }}
                      >
                        {actionLoading ? "Signing Up..." : "Sign Up Student Account"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions Footer */}
              {selectedApp.status !== "approved" && selectedApp.status !== "rejected" && (
                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border mt-6 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRejectConfirm(true)}
                    disabled={actionLoading || (userRole as string) === "Guest"}
                    className="h-10 text-xs font-bold border-red-500/30 text-red-400 hover:bg-red-950/20"
                  >
                    Reject Candidate
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionLoading || (userRole as string) === "Guest"}
                    className="h-10 text-xs font-bold shadow-md"
                    style={{ backgroundColor: brandColor, color: "#fff" }}
                  >
                    {actionLoading ? "Processing..." : (userRole as string) === "Guest" ? "Read Only" : "Approve Candidate"}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Rejection Confirmation Dialog */}
      <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <DialogContent className="max-w-md p-6 bg-background text-foreground border border-border shadow-2xl rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <DialogTitle className="text-lg font-black text-center text-foreground">
              Confirm Rejection
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center leading-relaxed">
              Are you sure you want to reject the application of <strong className="text-foreground">{selectedApp?.firstName} {selectedApp?.lastName}</strong>? This action is permanent and will notify the candidate.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="grid grid-cols-2 gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRejectConfirm(false)}
              disabled={actionLoading}
              className="h-10 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRejectConfirm}
              disabled={actionLoading}
              className="h-10 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
            >
              {actionLoading ? "Processing..." : "Yes, Reject Candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Document Rejection Dialog */}
      <Dialog open={showDocRejectModal} onOpenChange={setShowDocRejectModal}>
        <DialogContent className="max-w-md p-6 bg-background text-foreground border border-border shadow-2xl rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <DialogTitle className="text-lg font-black text-center text-foreground">
              Reject Transcript/Document
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center leading-relaxed">
              Please enter the reason for rejecting this document. This feedback will be visible to the applicant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4">
            <Label htmlFor="reject-reason-textarea" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Rejection Reason
            </Label>
            <Input
              id="reject-reason-textarea"
              placeholder="e.g. The transcript is blurry or missing the graduation date."
              value={rejectReasonText}
              onChange={(e) => setRejectReasonText(e.target.value)}
              className="w-full text-xs bg-background h-10"
            />
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDocRejectModal(false);
                setDocToRejectId(null);
              }}
              disabled={actionLoading}
              className="h-10 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (docToRejectId) {
                  await handleUpdateDocStatus(docToRejectId, "rejected", rejectReasonText);
                  setShowDocRejectModal(false);
                  setDocToRejectId(null);
                }
              }}
              disabled={actionLoading || !rejectReasonText.trim()}
              className="h-10 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
            >
              {actionLoading ? "Processing..." : "Reject Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        batches={batches}
        primaryColor={brandColor}
        onImportSuccess={() => {
          // reload the page to show newly onboarded students
          window.location.reload();
        }}
      />
    </div>
  );
}
