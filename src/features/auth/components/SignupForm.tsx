"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
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
  LockKeyhole,
  Check,
  X,
  ChevronRight,
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

// ─── Password Strength Logic ───
interface PasswordCheck {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: "8+ characters", test: (pw) => pw.length >= 8 },
  { label: "Uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "Lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "Number", test: (pw) => /[0-9]/.test(pw) },
  { label: "Special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string; bgColor: string } {
  if (!pw) return { score: 0, label: "", color: "", bgColor: "" };
  const passed = PASSWORD_CHECKS.filter((c) => c.test(pw)).length;
  if (passed <= 1) return { score: 1, label: "Very Weak", color: "text-red-500", bgColor: "bg-red-500" };
  if (passed === 2) return { score: 2, label: "Weak", color: "text-orange-500", bgColor: "bg-orange-500" };
  if (passed === 3) return { score: 3, label: "Fair", color: "text-amber-500", bgColor: "bg-amber-500" };
  if (passed === 4) return { score: 4, label: "Strong", color: "text-emerald-500", bgColor: "bg-emerald-500" };
  return { score: 5, label: "Excellent", color: "text-teal-400", bgColor: "bg-teal-400" };
}

// ─── Wizard Step Data ───
const STEPS = [
  { id: "personal", title: "Personal Info", icon: User, description: "Your name and contact details" },
  { id: "credentials", title: "Credentials", icon: Lock, description: "Set your email and password" },
  { id: "enrollment", title: "Enrollment", icon: GraduationCap, description: "Select cohort and confirm" },
];

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

  // Wizard state
  const [step, setStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">("forward");

  // Password strength
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passChecks = useMemo(() => PASSWORD_CHECKS.map((c) => ({ ...c, passed: c.test(password) })), [password]);

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
            // Jump straight to password step for locked applications
            setStep(1);

            // Double check that the applicant paid
            if (res.data.status !== "paid" && res.data.status !== "approved") {
              setError("This application requires payment before signup activation.");
            }
          } else {
            setError(res.error || "Failed to locate pre-existing application details.");
          }
        })
        .catch(() => {
          setError("An error occurred while retrieving application details.");
        })
        .finally(() => {
          setAppFetching(false);
        });
    }
  }, [appId]);

  const canProceedStep0 = firstName.trim() !== "" && lastName.trim() !== "" && phone.trim() !== "" && dateOfBirth !== "";
  const canProceedStep1 = email.trim() !== "" && password.length >= 8 && strength.score >= 3;
  const canProceedStep2 = batchId !== "";

  const goNext = () => {
    if (step === 0 && !canProceedStep0) {
      setError("Please fill in all personal information fields.");
      return;
    }
    if (step === 1 && !canProceedStep1) {
      setError("Please enter a valid email and a password with at least 'Fair' strength.");
      return;
    }
    setError(null);
    setSlideDirection("forward");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError(null);
    setSlideDirection("backward");
    setStep((s) => Math.max(s - 1, 0));
  };

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
        <Card className="sexy-border-glow bg-card/45 backdrop-blur-md shadow-2xl border border-border/60">
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
      <Card className="sexy-border-glow bg-card/45 backdrop-blur-md shadow-2xl border border-border/60 overflow-hidden">
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

        {/* ── Wizard Step Indicators ── */}
        {!isLocked && (
          <div className="px-6 pb-2">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => {
                const StepIcon = s.icon;
                const isActive = i === step;
                const isComplete = i < step;
                return (
                  <React.Fragment key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (i < step) {
                          setSlideDirection("backward");
                          setStep(i);
                        }
                      }}
                      disabled={i > step}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-300 ${
                        isActive
                          ? "bg-primary/10 border border-primary/20"
                          : isComplete
                          ? "bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15"
                          : "bg-muted/30 border border-transparent opacity-40"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 transition-all duration-300 ${
                        isActive
                          ? "bg-primary/20 text-primary"
                          : isComplete
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {isComplete ? <Check className="w-3 h-3" /> : <StepIcon className="w-3 h-3" />}
                      </div>
                      <div className="text-left hidden sm:block">
                        <p className={`text-[10px] font-bold ${isActive ? "text-primary" : isComplete ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {s.title}
                        </p>
                      </div>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-px mx-1.5 transition-colors duration-500 ${
                        i < step ? "bg-emerald-500/40" : "bg-border/40"
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        <CardContent className="space-y-5">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-xs text-destructive flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
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
            {/* ── Step 0: Personal Info ── */}
            <div
              className={`space-y-4 transition-all duration-300 ease-out ${
                step === 0
                  ? "opacity-100 translate-x-0 max-h-[600px]"
                  : slideDirection === "forward"
                  ? "opacity-0 -translate-x-4 max-h-0 overflow-hidden pointer-events-none absolute"
                  : "opacity-0 translate-x-4 max-h-0 overflow-hidden pointer-events-none absolute"
              }`}
            >
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
                    Phone Number *
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
            </div>

            {/* ── Step 1: Credentials ── */}
            <div
              className={`space-y-4 transition-all duration-300 ease-out ${
                step === 1
                  ? "opacity-100 translate-x-0 max-h-[600px]"
                  : step > 1
                  ? "opacity-0 -translate-x-4 max-h-0 overflow-hidden pointer-events-none absolute"
                  : "opacity-0 translate-x-4 max-h-0 overflow-hidden pointer-events-none absolute"
              }`}
            >
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

              {/* ── Password Strength Meter ── */}
              {password.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Strength bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Strength</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider ${strength.color}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${strength.bgColor}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Individual checks */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {passChecks.map((check) => (
                      <div
                        key={check.label}
                        className={`flex items-center gap-1.5 text-[9px] font-semibold transition-all duration-200 ${
                          check.passed ? "text-emerald-500" : "text-muted-foreground/60"
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all duration-200 ${
                          check.passed
                            ? "bg-emerald-500/20 border-emerald-500/40"
                            : "bg-muted/30 border-border/40"
                        }`}>
                          {check.passed ? <Check className="w-2 h-2" /> : <X className="w-2 h-2" />}
                        </div>
                        {check.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Step 2: Enrollment ── */}
            <div
              className={`space-y-4 transition-all duration-300 ease-out ${
                step === 2
                  ? "opacity-100 translate-x-0 max-h-[600px]"
                  : "opacity-0 translate-x-4 max-h-0 overflow-hidden pointer-events-none absolute"
              }`}
            >
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

              {/* Summary Card */}
              <div className="bg-secondary/30 border border-border/40 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Application Summary</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Name:</span> <strong className="text-foreground">{firstName} {lastName}</strong></div>
                  <div><span className="text-muted-foreground">Email:</span> <strong className="text-foreground truncate block">{email}</strong></div>
                  <div><span className="text-muted-foreground">Phone:</span> <strong className="text-foreground">{phone || "—"}</strong></div>
                  <div><span className="text-muted-foreground">DOB:</span> <strong className="text-foreground">{dateOfBirth || "—"}</strong></div>
                </div>
              </div>
            </div>

            {/* ── Navigation Buttons ── */}
            <div className="flex items-center gap-3 pt-2">
              {step > 0 && !isLocked && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  disabled={loading}
                  className="h-10 text-xs font-bold gap-1.5 rounded-xl border-border/60"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
              )}

              {step < STEPS.length - 1 && !isLocked ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="flex-1 h-10 text-xs font-bold shadow-lg rounded-xl gap-1.5"
                  style={{ backgroundColor: brandColor, color: "#fff" }}
                  disabled={loading}
                >
                  Continue <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-10 text-xs font-bold shadow-lg rounded-xl"
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
              )}
            </div>
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
