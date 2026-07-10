"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/features/auth/actions/auth-actions";
import { LogOut, LayoutDashboard, Home, ShieldAlert } from "lucide-react";

interface GatewayUserControlsProps {
  email: string;
  role: string;
  /** Show a "Back to Gateway" link (for parent tenant hubs) */
  showGatewayLink?: boolean;
  primaryColor?: string;
}

export function GatewayUserControls({ email, role, showGatewayLink, primaryColor = "#f97316" }: GatewayUserControlsProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  const isAdmin = role === "SuperAdmin" || role === "Owner";
  const displayEmail = email;

  return (
    <div className="flex items-center gap-2">
      {/* User avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm select-none border"
        style={{ backgroundColor: primaryColor + "15", borderColor: primaryColor + "30", color: primaryColor }}
        title={displayEmail}
      >
        {displayEmail.substring(0, 2).toUpperCase()}
      </div>

      <span className="text-[10px] text-muted-foreground hidden sm:inline max-w-[140px] truncate" title={displayEmail}>
        <strong className="text-foreground">{displayEmail.split("@")[0]}</strong>
      </span>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Back to Platform Home */}
      {showGatewayLink && (
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl text-[10px] font-bold h-8 px-3 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all border border-border/50 cursor-pointer"
          title="Back to Platform Home"
        >
          <Home className="w-3 h-3" /> Home
        </a>
      )}

      {/* Admin Console */}
      {isAdmin && (
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-1.5 rounded-xl text-[10px] font-bold h-8 px-3 text-white hover:opacity-90 transition-all shadow-md cursor-pointer"
          style={{ backgroundColor: primaryColor }}
        >
          <ShieldAlert className="w-3 h-3" /> Console
        </Link>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="inline-flex items-center gap-1.5 rounded-xl text-[10px] font-bold h-8 px-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20 cursor-pointer"
        title="Logout"
      >
        <LogOut className="w-3 h-3" /> Logout
      </button>
    </div>
  );
}
