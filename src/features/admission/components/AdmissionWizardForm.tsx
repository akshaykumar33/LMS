"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { submitAdmissionApplicationAction, submitDocumentAction } from "../actions/admission-actions";
import { AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Upload, CreditCard, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Batch {
  id: string;
  name: string;
  description: string | null;
}

interface AdmissionWizardFormProps {
  batches: Batch[];
  tenantName: string;
  primaryColor?: string;
}

export function AdmissionWizardForm({ batches, tenantName, primaryColor }: AdmissionWizardFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    batchId: batches[0]?.id || "",
    highestDegree: "",
    institution: "",
    gpaOrPercentage: "",
    graduationYear: new Date().getFullYear().toString(),
    experienceMonths: "0",
    selectedDocType: "Undergraduate Degree Transcript",
    uploadedDocs: [] as { documentName: string; fileUrl: string }[],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    console.log("change", e.target.name, e.target.value);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.dateOfBirth) {
        setError("Please complete all personal details.");
        return;
      }
      // 🔹 NEW: age validation
      if (!isOldEnough(formData.dateOfBirth)) {
        setError(`Applicant must be at least ${MIN_AGE_YEARS} years old.`);
        return;
      }
    } else if (step === 2) {
      if (!formData.batchId || !formData.highestDegree || !formData.institution || !formData.gpaOrPercentage) {
        setError("Please complete all academic details.");
        return;
      }
    }
    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (formData.uploadedDocs.length >= 3) {
      setError("You can only upload up to 3 documents.");
      return;
    }

    // Check if document type is already uploaded
    const isAlreadyUploaded = formData.uploadedDocs.some(d => d.documentName === formData.selectedDocType);
    if (isAlreadyUploaded) {
      setError(`You have already uploaded a document for '${formData.selectedDocType}'.`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const { getPresignedUrlAction } = await import("../actions/admission-actions");
      const res = await getPresignedUrlAction(file.name, file.type);

      if (!res.success || !res.uploadUrl || !res.fileUrl) {
        throw new Error(res.error || "Failed to generate presigned upload URL.");
      }

      const uploadRes = await fetch(res.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.statusText}`);
      }

      setFormData(prev => ({
        ...prev,
        uploadedDocs: [
          ...prev.uploadedDocs,
          { documentName: prev.selectedDocType, fileUrl: res.fileUrl }
        ]
      }));
    } catch (err: any) {
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveDoc = (index: number) => {
    setFormData(prev => ({
      ...prev,
      uploadedDocs: prev.uploadedDocs.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Require at least one document
    if (formData.uploadedDocs.length === 0) {
      setError("Please upload at least one document (e.g. Undergraduate Degree Transcript) to proceed.");
      return;
    }

    // Require transcript specifically as P0
    const hasTranscript = formData.uploadedDocs.some(d => d.documentName === "Undergraduate Degree Transcript");
    if (!hasTranscript) {
      setError("Undergraduate Degree Transcript is required.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Submit Application
      const appResult = await submitAdmissionApplicationAction({
        batchId: formData.batchId,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        academicHistory: {
          highestDegree: formData.highestDegree,
          institution: formData.institution,
          gpaOrPercentage: formData.gpaOrPercentage,
          graduationYear: parseInt(formData.graduationYear),
          experienceMonths: parseInt(formData.experienceMonths),
        },
      });

      if (!appResult.success) {
        throw new Error(appResult.error || "Failed to submit application.");
      }

      const appId = appResult.applicationId!;

      // 2. Submit all uploaded documents
      for (const doc of formData.uploadedDocs) {
        const docResult = await submitDocumentAction(appId, doc.documentName, doc.fileUrl);
        if (!docResult.success) {
          console.warn(`Failed to submit document ${doc.documentName}:`, docResult.error);
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during submission.");
      setLoading(false);
    }
  };

  const brandColor = primaryColor || "#0ea5e9";

  const MIN_AGE_YEARS = 10;

function isOldEnough(dobString: string) {
  if (!dobString) return false;

  const dob = new Date(dobString);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= MIN_AGE_YEARS;
}

  if (submitted) {
    return (
      <Card className="w-full max-w-xl backdrop-blur-lg shadow-2xl border-border/60">
        <CardContent className="p-8 space-y-6 text-center text-xs">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold text-foreground">Application Submitted!</CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-normal">
              Your application has been successfully recorded and is now under review.
            </CardDescription>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background/30 text-left space-y-2 text-xs">
            <p><strong>Applicant Name:</strong> {formData.firstName} {formData.lastName}</p>
            <p><strong>Email Address:</strong> {formData.email}</p>
            <p><strong>Next Steps:</strong> The admissions team will review your transcripts and academic details. Once approved, your student credentials will be shared manually by the administration. No payment is required for this phase.</p>
          </div>
          <Button
            onClick={() => router.push("/login")}
            className="w-full h-10 text-xs font-bold shadow-md"
            style={{ backgroundColor: brandColor, color: "#fff" }}
          >
            Return to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl backdrop-blur-lg shadow-2xl border-border/60">
      <CardContent className="p-8 space-y-6 text-xs">
        
        {/* Step Indicators */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  step >= s
                    ? "text-white"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
                style={step >= s ? { backgroundColor: brandColor } : undefined}
              >
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </span>
              <span className="text-[10px] hidden sm:inline font-bold uppercase tracking-wider text-muted-foreground">
                {s === 1 && "Personal"}
                {s === 2 && "Academic"}
                {s === 3 && "Documents"}
              </span>
              {s < 3 && <span className="text-muted-foreground/40 hidden sm:inline">&rarr;</span>}
            </div>
          ))}
        </div>

        <div className="text-center space-y-1">
          <CardTitle className="text-lg">Admission Application</CardTitle>
          <CardDescription className="text-xs">
            Apply to {tenantName} in 3 simple steps.
          </CardDescription>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-xs text-destructive flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">1. Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First Name *</Label>
                <Input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Name *</Label>
                <Input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address *</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  placeholder="john.doe@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date of Birth *</Label>
              <Input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="h-10 text-xs"
                required
              />
            </div>
          </div>
        )}

        {/* Step 2: Academic Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">2. Academic Background</h3>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Academic Cohort Batch *</Label>
              <Select
                value={formData.batchId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, batchId: value }))
                }
              >
                <SelectTrigger className="w-full h-10 px-3 rounded-lg border border-border bg-card text-xs text-foreground shadow-sm focus:border-sky-500 focus:outline-none">
                  <SelectValue placeholder="Select cohort batch" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-border bg-popover shadow-lg text-popover-foreground">
                  {batches.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      className="text-xs text-popover-foreground py-2 px-3 rounded-md cursor-pointer focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Highest Degree Obtained *</Label>
                <Input
                  type="text"
                  name="highestDegree"
                  value={formData.highestDegree}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  placeholder="B.Tech in Electronics"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Institution Name *</Label>
                <Input
                  type="text"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  placeholder="MIT"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GPA / Percentage *</Label>
                <Input
                  type="text"
                  name="gpaOrPercentage"
                  value={formData.gpaOrPercentage}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  placeholder="8.9 CGPA / 89%"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Graduation Year</Label>
                <Input
                  type="number"
                  name="graduationYear"
                  value={formData.graduationYear}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Experience (Months)</Label>
                <Input
                  type="number"
                  name="experienceMonths"
                  value={formData.experienceMonths}
                  onChange={handleChange}
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Document Upload */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">3. Document Upload (S3 Sandbox)</h3>
            
            <div className="space-y-4">
              {/* Uploaded Documents List */}
              {formData.uploadedDocs.length > 0 && (
                <div className="space-y-2 w-full text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Uploaded Documents ({formData.uploadedDocs.length}/3)</p>
                  <div className="grid gap-2">
                    {formData.uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-border bg-card/25 backdrop-blur-sm rounded-xl text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">{doc.documentName}</p>
                          <p className="text-[9px] text-muted-foreground font-mono truncate max-w-[260px]">{doc.fileUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Selector and Zone */}
              {formData.uploadedDocs.length < 3 ? (
                <div className="space-y-4 w-full text-left mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Select Document Type</Label>
                    <Select
                      value={formData.selectedDocType}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, selectedDocType: val }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Undergraduate Degree Transcript">Undergraduate Degree Transcript *</SelectItem>
                        <SelectItem value="Identity Proof (Passport/National ID)">Identity Proof (Passport/National ID)</SelectItem>
                        <SelectItem value="High School Certificate">High School Certificate</SelectItem>
                        <SelectItem value="Resume / CV">Resume / CV</SelectItem>
                        <SelectItem value="Experience Certificate">Experience Certificate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-6 border-2 border-dashed border-border bg-background/30 rounded-2xl flex flex-col items-center justify-center text-center">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-mono">Uploading to server...</span>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 cursor-pointer hover:border-slate-500 py-4 px-6 rounded-xl transition-all w-full">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground">Choose Document File (PDF/Image)</span>
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-center text-xs text-emerald-400 font-semibold">
                  ✓ Maximum document limit of 3 files reached. Please review or submit.
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={loading}
              className="h-10 px-5 text-xs font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
            </Button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="h-10 px-5 text-xs font-bold shadow-md"
              style={{ backgroundColor: brandColor, color: "#fff" }}
            >
              Continue <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || formData.uploadedDocs.length === 0}
              className="h-10 px-6 text-xs font-bold shadow-md"
              style={{ backgroundColor: brandColor, color: "#fff" }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Submitting...</>
              ) : (
                <>
                  Submit Application <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
