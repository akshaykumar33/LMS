import Link from "next/link";
import { ShieldAlert, ArrowLeft, Mail } from "lucide-react";

export default function SuspendedPage() {
  return (
    <div className="flex flex-col flex-1 bg-[#070a13] text-[#f1f5f9] min-h-screen relative overflow-hidden font-sans items-center justify-center">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-60"></div>
      
      {/* Radial Glowing Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="relative max-w-md w-full mx-auto p-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-red-500/20 text-center space-y-6 z-10 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-400 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Access Suspended
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            This Academy organization portal has been temporarily suspended by the platform owner. Access to courses, workspaces, and administrative settings is disabled.
          </p>
        </div>

        <div className="bg-slate-950/40 border border-border/30 rounded-2xl p-4 text-[11px] leading-relaxed text-muted-foreground text-left space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-primary" /> What can I do?
          </p>
          <p>
            If you are a student, faculty member, or admin, please contact your academy dean or the Wysbryx platform administration team to resolve outstanding status reviews.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl text-xs font-black h-11 px-4 bg-red-500 hover:bg-red-600 text-white transition-all shadow-md shadow-red-500/20 cursor-pointer w-full"
          >
            Return to SaaS Network
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold h-11 px-4 border border-border bg-card/45 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer w-full"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Sign In to Another Account
          </Link>
        </div>
      </div>
    </div>
  );
}
