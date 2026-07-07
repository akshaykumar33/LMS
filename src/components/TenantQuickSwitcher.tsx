"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Check, Cpu } from "lucide-react";

interface TenantQuickSwitcherProps {
  userRole: string;
  currentSubdomain: string;
}

const AVAILABLE_TENANTS = [
  { name: "Intel Academy", subdomain: "intel", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  { name: "AMD Center", subdomain: "amd", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { name: "TSMC Academy", subdomain: "tsmc", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
];

export function TenantQuickSwitcher({ userRole, currentSubdomain }: TenantQuickSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only administrators can switch tenants
  const isAllowed = ["Owner", "Admin", "Program Manager", "SuperAdmin"].includes(userRole);

  if (!mounted || !isAllowed) return null;

  const handleSwitch = (targetSubdomain: string) => {
    if (targetSubdomain === currentSubdomain) return;

    const host = window.location.host; // e.g. "intel.localhost:3080" or "localhost:3080"
    const protocol = window.location.protocol;
    const pathname = window.location.pathname;

    // Handle Localhost
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      const parts = host.split(".");
      if (parts.length > 1 && !parts[parts.length - 2].includes("localhost")) {
        parts[0] = targetSubdomain;
        window.location.href = `${protocol}//${parts.join(".")}${pathname}`;
      } else {
        // Fallback to query param on bare localhost
        window.location.href = `${protocol}//${host}${pathname}?tenant=${targetSubdomain}`;
      }
    } else {
      // Handle Production (Vercel or custom domain)
      const parts = host.split(".");
      const isVercel = host.endsWith(".vercel.app");
      if ((isVercel && parts.length > 3) || (!isVercel && parts.length > 2)) {
        parts[0] = targetSubdomain;
        window.location.href = `${protocol}//${parts.join(".")}${pathname}`;
      } else {
        window.location.href = `${protocol}//${host}${pathname}?tenant=${targetSubdomain}`;
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 border border-slate-700/80 text-primary hover:text-white shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95 group"
        title="Quick Switch Tenant Subdomain"
      >
        <ArrowLeftRight className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop Clicker */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute bottom-16 right-0 w-64 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Subdomain Swapper
              </span>
            </div>
            
            <div className="space-y-2">
              {AVAILABLE_TENANTS.map((t) => {
                const isActive = t.subdomain === currentSubdomain;
                return (
                  <button
                    key={t.subdomain}
                    type="button"
                    onClick={() => handleSwitch(t.subdomain)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left border transition-all text-xs font-bold ${
                      isActive
                        ? "bg-slate-800/60 border-slate-700 text-white cursor-default"
                        : "bg-slate-900/35 border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40 hover:border-slate-800/80 active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                      <span className="truncate">{t.name}</span>
                    </div>
                    {isActive ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[9px] text-slate-600 font-mono font-normal">
                        .{t.subdomain}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
