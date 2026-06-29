"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "../actions/auth-actions";
import quickLoginData from "../data/quick-login-credentials.json";
import { LogIn, Mail, Lock, AlertCircle, Loader2, ShieldCheck, GraduationCap, Briefcase, Key, ArrowRight, X, Eye, EyeOff, Terminal, ChevronRight, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LoginFormProps {
  tenantName: string;
  primaryColor?: string;
  subdomain: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  GraduationCap,
  Briefcase,
  Key,
  ShieldCheck,
  Users,
  Terminal,
};

export function LoginForm({ tenantName, primaryColor, subdomain }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmulator, setShowEmulator] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ESC key to close emulator
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowEmulator(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginAction({ email, password });
      if (result.success) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(result.error || "Invalid credentials.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);

    try {
      const result = await loginAction({ email: demoEmail, password: "Password123" });
      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error || "Demo login failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const brandColor = primaryColor || "#0ea5e9";

  const isParent = subdomain === "localhost" || subdomain === "" || subdomain === "www" || subdomain === "vt";
  const activeSubdomain = isParent ? "intel" : subdomain;

  // Dynamically compile all sandbox credentials from quick-login-credentials.json
  const allAccounts = [
    ...quickLoginData.parent,
    ...quickLoginData.tenant
  ];

  // Deduplicate by roleName to avoid double listing Super Admin
  const uniqueRoles = new Map<string, typeof allAccounts[number]>();
  for (const acc of allAccounts) {
    uniqueRoles.set(acc.roleName, acc);
  }

  const demoAccounts = Array.from(uniqueRoles.values()).map(account => {
    let email = account.email;
    if (account.roleName === "Student (Certified)") {
      email = "linus.torvalds@student.intel.com";
    } else {
      email = email.replace("{{subdomain}}", activeSubdomain);
    }

    const IconComp = iconMap[account.iconName] || Key;

    return {
      roleName: account.roleName,
      email,
      desc: account.desc,
      icon: IconComp,
      color: account.color,
      bg: account.bg,
      border: account.border,
    };
  });

  return (
    <TooltipProvider>
      <div className="w-full max-w-md mx-auto">
        {/* ── Login Card ── */}
        <Card className="backdrop-blur-lg shadow-2xl border-border/60">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-1" style={{ backgroundColor: brandColor + '15' }}>
              <LogIn className="w-5 h-5" style={{ color: brandColor }} />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter credentials to access the <strong className="text-foreground">{tenantName}</strong> portal.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {searchParams.get("activated") === "true" && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>Account Activated:</strong> Your student profile has been created successfully. Please sign in below.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="pl-10 h-10 text-xs"
                    placeholder="name@organization.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <a href="/forgot-password" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 text-xs font-bold shadow-lg"
                style={{ backgroundColor: brandColor, color: "#fff" }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 mr-1.5" /> Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <Separator className="flex-1" />
              <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase font-black tracking-widest">Or continue with</span>
              <Separator className="flex-1" />
            </div>

            {/* SSO Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alert("SSO integration sandbox: Google SSO selected.")}
                className="h-10 text-[10px] font-bold gap-1.5"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alert("SSO integration sandbox: GitHub SSO selected.")}
                className="h-10 text-[10px] font-bold gap-1.5"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alert("SSO integration sandbox: Okta Enterprise SSO selected.")}
                className="h-10 text-[10px] font-bold gap-1.5"
              >
                <svg className="w-3.5 h-3.5 shrink-0 text-[#007DC1]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                </svg>
                Okta
              </Button>
            </div>

            <Separator />

            <div className="text-center flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                New student?{" "}
                <a href="/admission/apply" className="inline-flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground transition-colors underline decoration-border hover:decoration-foreground underline-offset-4">
                  Apply & Register Instantly <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Premium Floating Dev Console Trigger ── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowEmulator(true)}
              className="fixed bottom-6 right-6 z-40 group"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/30 to-orange-500/30 blur-md animate-pulse"></div>
                <div className="relative bg-slate-900/95 hover:bg-slate-800/95 border border-amber-500/30 hover:border-amber-400/50 rounded-2xl px-5 h-12 shadow-2xl flex items-center gap-2.5 text-xs font-bold transition-all group-hover:scale-105 group-active:scale-95 backdrop-blur-xl">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 group-hover:text-amber-200">Dev Console</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]"></div>
                </div>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Open sandbox account emulator
          </TooltipContent>
        </Tooltip>

        {/* ── Command Center Dialog ── */}
        <Dialog open={showEmulator} onOpenChange={setShowEmulator}>
          <DialogContent className="max-w-lg p-0 gap-0 bg-slate-950/98 border-slate-700/60 shadow-[0_0_60px_rgba(0,0,0,0.5),0_0_30px_rgba(245,158,11,0.08)] overflow-hidden backdrop-blur-xl [&>button]:text-slate-400 [&>button]:hover:text-white">
            {/* Terminal-style header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border-b border-slate-700/50 px-5 py-3.5 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-mono font-bold text-slate-300">dev-console</span>
                <Badge variant="secondary" className="text-[9px] font-mono h-5 px-1.5 bg-slate-800 text-slate-500 border-slate-700">
                  ~/{activeSubdomain}
                </Badge>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Console prompt */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-emerald-400">❯</span>
                <span className="text-slate-400">Select an account to emulate instant login</span>
                <span className="w-2 h-4 bg-amber-400/70 animate-pulse rounded-sm"></span>
              </div>

              {/* Role Cards */}
              <div className="space-y-2">
                {demoAccounts.map((account) => {
                  const IconComp = account.icon;
                  return (
                    <Button
                      key={account.roleName}
                      variant="ghost"
                      onClick={() => {
                        handleQuickLogin(account.email);
                        setShowEmulator(false);
                      }}
                      disabled={loading}
                      className={`w-full h-auto p-3.5 justify-start rounded-xl border ${account.border} bg-slate-900/60 hover:bg-slate-800/80 transition-all group`}
                    >
                      <div className={`p-2.5 rounded-lg ${account.bg} ${account.color} shrink-0 border ${account.border} mr-3`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">{account.roleName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-normal font-normal">{account.desc}</p>
                        <span className="text-[9px] font-mono text-slate-600 mt-1 block truncate font-normal">{account.email}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>

              {isParent && (
                <div className="p-3 bg-slate-900/50 border border-slate-700/40 rounded-xl text-[10px] text-slate-500 leading-relaxed font-mono">
                  <span className="text-amber-400">INFO</span> Academy roles are domain-isolated. Visit{" "}
                  <a href="http://intel.localhost:3000/login" className="text-sky-400 underline hover:text-sky-300">intel</a>,{" "}
                  <a href="http://amd.localhost:3000/login" className="text-sky-400 underline hover:text-sky-300">amd</a>, or{" "}
                  <a href="http://tsmc.localhost:3000/login" className="text-sky-400 underline hover:text-sky-300">tsmc</a> subdomains.
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="border-t border-slate-700/40 px-5 py-2.5 flex items-center justify-between bg-slate-900/50">
              <span className="text-[9px] font-mono text-slate-600">sandbox emulator v1.0</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-mono h-5 px-1.5 border-slate-700/60 text-slate-500 bg-slate-800/60">
                  ESC
                </Badge>
                <span className="text-[9px] font-mono text-slate-600">to close</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
