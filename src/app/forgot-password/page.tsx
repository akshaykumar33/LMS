"use client";

import React, { useState } from "react";
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setStatus("idle");

    // Simulate sending recovery email
    setTimeout(() => {
      setLoading(false);
      setStatus("success");
      setMessage(`A password recovery link has been dispatched to ${email}. Please inspect your inbox and spam folders.`);
    }, 1200);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background p-6 relative overflow-hidden min-h-screen text-foreground">
      {/* Background decoration */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-10 bg-primary"
      ></div>

      <div className="relative z-10 w-full max-w-md bg-card border border-border backdrop-blur-lg shadow-2xl rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-primary/10">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Recover Password
          </h2>
          <p className="text-xs text-muted-foreground">
            Provide your registered account email and we'll dispatch instructions to reset your password.
          </p>
        </div>

        {status === "success" ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-400 flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <strong className="block mb-0.5">Recovery Sent</strong>
                {message}
              </div>
            </div>
            <a
              href="/login"
              className="w-full h-10 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === "error" && (
              <div className="bg-destructive/10 border border-destructive/30 p-3.5 rounded-lg text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {message}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full h-10 pl-10 pr-3.5 rounded-lg border border-border bg-input text-xs text-foreground placeholder-muted-foreground focus:outline-none disabled:opacity-50"
                  placeholder="name@organization.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-xs font-bold text-white hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer bg-primary"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Send Password Reset Link"
              )}
            </button>
          </form>
        )}
      </div>

      <div className="relative z-10 mt-6">
        <a 
          href="/login" 
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </a>
      </div>
    </div>
  );
}
