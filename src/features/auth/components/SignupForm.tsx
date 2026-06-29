"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  registerStudentAction, 
  getPublicApplicationDetailsAction,
  completeSignupAndEnrollAction 
} from "@/features/admission/actions/admission-actions";
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Calendar, 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  GraduationCap, 
  Eye, 
  EyeOff, 
  Phone, 
  ArrowRight,
  ShieldAlert,
  LockKeyhole
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Batch {
  id: string;
  name: string;
  description: string | null;
}

interface SignupFormProps {
  batches: Batch[];
  tenantName: string;
  primaryColor?: string;
}

export function SignupForm(props: SignupFormProps) {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-lg mx-auto backdrop-blur-lg shadow-2xl border-border/60">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Initializing signup console...</p>
        </CardContent>
      </Card>
    }>
      <SignupFormContent {...props} />
    </Suspense>
  );
}

function SignupFormContent({ batches, tenantName, primaryColor }: SignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get("appId");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [batchId, setBatchId] = useState(batches[0]?.id || "");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [appFetching, setAppFetching] = useState(false);

  // If appId is provided in query params, fetch student details and lock fields
  useEffect(() => {
    if (appId) {
      setAppFetching(true);
      setError(null);
      getPublicApplicationDetailsAction(appId)
        .then((res) => {
          if (res.success && res.data) {
            setFirstName(res.data.firstName);
            setLastName(res.data.lastName);
            setEmail(res.data.email);
            setPhone(res.data.phone || "");
            setDateOfBirth(res.data.dateOfBirth || "");
            setBatchId(res.data.batchId);
            setIsLocked(true);

            // Double check that the applicant paid
            if (res.data.status !== "paid" && res.data.status !== "approved") {
              setError("This application requires payment before signup activation.");
            }
          } else {
            setError(res.error || "Failed to locate pre-existing application details.");
          }
        })
        .catch((err) => {
          setError("An error occurred while retrieving application details.");
        })
        .finally(() => {
          setAppFetching(false);
        });
    }
  }, [appId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !batchId || !dateOfBirth) {
      setError("Please fill in all required fields.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isLocked && appId) {
        // Enrolled activation flow
        const result = await completeSignupAndEnrollAction(appId, password);
        if (result.success) {
          router.push(`/login?email=${encodeURIComponent(email)}&activated=true`);
          router.refresh();
        } else {
          setError(result.error || "Failed to activate student profile.");
        }
      } else {
        // Standard self-signup flow
        const result = await registerStudentAction({
          firstName,
          lastName,
          email,
          password,
          batchId,
          phone,
          dateOfBirth,
        });

        if (result.success) {
          router.push(`/checkout?appId=${result.applicationId}`);
        } else {
          setError(result.error || "Registration failed. Please try another email.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  const brandColor = primaryColor || "#0ea5e9";

  if (appFetching) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <Card className="backdrop-blur-lg shadow-2xl border-border/60">
          <CardContent className="p-12 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">
              Retrieving verified enrollment credentials...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card className="backdrop-blur-lg shadow-2xl border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-1" style={{ backgroundColor: brandColor + '15' }}>
            {isLocked ? (
              <LockKeyhole className="w-5 h-5" style={{ color: brandColor }} />
            ) : (
              <UserPlus className="w-5 h-5" style={{ color: brandColor }} />
            )}
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            {isLocked ? "Activate Student Account" : "Create Student Account"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isLocked 
              ? "Set your password to activate your verified student workspace account." 
              : `Apply and enroll instantly in the ${tenantName} portal.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {isLocked && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                <strong>Admission Payment Confirmed:</strong> Your information is locked to match your application. Please select a password to activate your account.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  First Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading || isLocked}
                    className="pl-10 h-10 text-xs"
                    placeholder="John"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Last Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading || isLocked}
                    className="pl-10 h-10 text-xs"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || isLocked}
                    className="pl-10 h-10 text-xs"
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Set Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pl-10 pr-10 h-10 text-xs"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading || isLocked}
                    className="pl-10 h-10 text-xs"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Date of Birth *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={loading || isLocked}
                    className="pl-10 h-10 text-xs dark:[color-scheme:dark]"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Enrollment Cohort / Batch *
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <Select value={batchId} onValueChange={setBatchId} disabled={loading || isLocked}>
                  <SelectTrigger className="w-full pl-10 h-10 text-xs justify-between bg-transparent border border-input">
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-xs font-bold shadow-lg mt-2"
              style={{ backgroundColor: brandColor, color: "#fff" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLocked ? (
                <>
                  Activate & Create Account <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              ) : (
                <>
                  Continue to Secure Payment <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          <Separator />

          <div className="text-center flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="inline-flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground transition-colors underline decoration-border hover:decoration-foreground underline-offset-4">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Sign In
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
