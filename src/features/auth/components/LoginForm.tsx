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
import { BrandLogo } from "@/components/BrandLogo";

interface LoginFormProps {
  tenantName: string;
  primaryColor?: string;
  subdomain: string;
  isParentDomain: boolean;
  chainLength?: number;
}

const getSubdomainUrl = (sub: string) => {
  return "/login";
};


const iconMap: Record<string, React.ComponentType<any>> = {
  GraduationCap,
  Briefcase,
  Key,
  ShieldCheck,
  Users,
  Terminal,
};

export function LoginForm({ tenantName, primaryColor, subdomain, isParentDomain, chainLength = 3 }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmulator, setShowEmulator] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string>("vti");

  const TENANT_BRANDING_MAP: Record<string, { name: string; subdomain: string; color: string; subtitle: string }> = {
    vti: {
      name: "Virginia Tech Innovation (VTI)",
      subdomain: "vti",
      color: "#861F41",
      subtitle: "Enter credentials to access the VTI Enterprise portal.",
    },
    intel: {
      name: "Virginia Tech Innovation (VTI)",
      subdomain: "vti",
      color: "#861F41",
      subtitle: "Enter credentials to access the VTI Enterprise portal.",
    },
    amd: {
      name: "Virginia Tech Innovation (VTI)",
      subdomain: "vti",
      color: "#861F41",
      subtitle: "Enter credentials to access the VTI Enterprise portal.",
    },
    nvidia: {
      name: "NVIDIA Corporation",
      subdomain: "nvidia",
      color: "#76B900",
      subtitle: "Enter credentials to access the NVIDIA Enterprise portal.",
    },
    wysbryx: {
      name: "Wysbryx Platform",
      subdomain: "wysbryx",
      color: "#f97316",
      subtitle: "Enter credentials to access the Wysbryx Super Admin console.",
    },
  };

  const currentBrand = TENANT_BRANDING_MAP[selectedTenant] || TENANT_BRANDING_MAP.vti;
  const activeTenantName = currentBrand.name;
  const activeSubdomain = currentBrand.subdomain;
  const activeBrandColor = currentBrand.color;
  const activeSubtitle = currentBrand.subtitle;

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
        router.push(callbackUrl);
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

  return (
    <TooltipProvider>
      <div className="w-full max-w-md mx-auto">
        {/* ── Login Card ── */}
        <Card className="backdrop-blur-lg shadow-2xl border-border/60">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex justify-center">
              <BrandLogo subdomain={activeSubdomain} className="h-10 w-auto" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-xs">
              {activeSubtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {searchParams.get("error") === "self_signup_disabled" && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  <strong>Registration Disabled:</strong> Student registration is a manual process. Self-signup is disabled on this platform. Credentials are shared manually by the administration.
                </span>
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
                className="w-full h-10 text-xs font-bold shadow-lg transition-all"
                style={{ backgroundColor: activeBrandColor, color: "#fff" }}
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
              <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                ⚡ 1-Click Demo Login Roles
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Subdomain Filter Tabs */}
            <div className="flex justify-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50 text-[10px] font-extrabold">
              {[
                { id: "vti", label: "VTI Org" },
                { id: "intel", label: "Intel" },
                { id: "amd", label: "AMD" },
                { id: "nvidia", label: "NVIDIA" },
                { id: "wysbryx", label: "Super Admin" },
              ].map((tab) => {
                const isSelected = selectedTenant === tab.id;
                const tabColor = TENANT_BRANDING_MAP[tab.id]?.color || "#0ea5e9";
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedTenant(tab.id)}
                    className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                      isSelected
                        ? "text-white shadow-sm font-black"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                    style={isSelected ? { backgroundColor: tabColor } : {}}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Demo Login Grid based on selectedTenant */}
            <div className="grid grid-cols-2 gap-2">
              {selectedTenant === "intel" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("faculty1@intel.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">Faculty</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">faculty1@intel.lms.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("student1@student.intel.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">Student</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">student1@student.intel.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("admin@intel.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">Child Admin</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">admin@intel.lms.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("owner@vti.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <Key className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">VTI Owner</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">owner@vti.com</span>
                    </div>
                  </Button>
                </>
              )}

              {selectedTenant === "vti" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("owner@vti.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <Key className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">VTI Owner</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">owner@vti.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("admin@intel.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">Intel Admin</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">admin@intel.lms.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("admin@amd.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">AMD Admin</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">admin@amd.lms.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("admin@qualcomm.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">Qualcomm Admin</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">admin@qualcomm.lms.com</span>
                    </div>
                  </Button>
                </>
              )}

              {selectedTenant === "amd" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("faculty1@amd.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">AMD Faculty</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">faculty1@amd.lms.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("student1@student.amd.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">AMD Student</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">student1@student.amd.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("admin@amd.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">AMD Admin</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">admin@amd.lms.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("owner@vti.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <Key className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">VTI Owner</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">owner@vti.com</span>
                    </div>
                  </Button>
                </>
              )}

              {selectedTenant === "nvidia" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("owner@nvidia.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">NVIDIA Owner</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">owner@nvidia.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("faculty1@gaming.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">Gaming Faculty</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">faculty1@gaming.lms.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("admin@gaming.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">Gaming Admin</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">admin@gaming.lms.com</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("admin@ai.lms.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">AI Systems Admin</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">admin@ai.lms.com</span>
                    </div>
                  </Button>
                </>
              )}

              {selectedTenant === "wysbryx" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => handleQuickLogin("superadmin@wysbryx.com")}
                    className="h-12 text-[10px] font-bold gap-2 justify-start px-3 bg-secondary/25 hover:bg-secondary/60 border border-border/50 rounded-xl col-span-2"
                  >
                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="block font-black text-foreground text-[10px] truncate">Wysbryx Super Admin</span>
                      <span className="text-[8px] text-muted-foreground font-medium truncate block">superadmin@wysbryx.com</span>
                    </div>
                  </Button>
                </>
              )}
            </div>

            <Separator />

            <div className="text-center flex flex-col gap-2">
              {/* Commented out self-signup link for manual onboarding phase
              <p className="text-xs text-muted-foreground">
                New student?{" "}
                <a href="/admission/apply" className="inline-flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground transition-colors underline decoration-border hover:decoration-foreground underline-offset-4">
                  Apply & Register Instantly <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </p>
              */}
              <p className="text-xs text-muted-foreground">
                Student registration is managed manually by administration.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Premium Floating Dev Console Trigger ──
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
        ── */}

        {/* ── Command Center Dialog ──
        <Dialog open={showEmulator} onOpenChange={setShowEmulator}>
          <DialogContent className="sm:max-w-lg p-0 gap-0 bg-slate-950/98 border-slate-700/60 shadow-[0_0_60px_rgba(0,0,0,0.5),0_0_30px_rgba(245,158,11,0.08)] overflow-hidden backdrop-blur-xl [&>button]:text-slate-400 [&>button]:hover:text-white">
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
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-emerald-400">❯</span>
                <span className="text-slate-400">Select an account to emulate instant login</span>
                <span className="w-2 h-4 bg-amber-400/70 animate-pulse rounded-sm"></span>
              </div>

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
                           <span className="text-xs font-bold text-white group-hover:opacity-90 transition-opacity">{account.roleName}</span>
                           <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-normal font-normal">{account.desc}</p>
                        <span className="text-[9px] font-mono text-slate-500 mt-1 block truncate font-normal">{account.email}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>

              {isParent && (
                <div className="p-3 bg-slate-900/50 border border-slate-700/40 rounded-xl text-[10px] text-slate-500 leading-relaxed font-mono">
                  <span className="text-amber-400">INFO</span> Academy roles are domain-isolated. Visit{" "}
                  <a href={getSubdomainUrl("intel")} className="text-sky-400 underline hover:text-sky-300">intel</a>,{" "}
                  <a href={getSubdomainUrl("amd")} className="text-sky-400 underline hover:text-sky-300">amd</a>, or{" "}
                  <a href={getSubdomainUrl("tsmc")} className="text-sky-400 underline hover:text-sky-300">tsmc</a> subdomains.
                </div>
              )}
            </div>

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
        ── */}
      </div>
    </TooltipProvider>
  );
}
