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

  const displayInitials = email ? email.substring(0, 2).toUpperCase() : "US";

  return (
    <div className="flex items-center gap-2">
      {/* User avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm select-none border shrink-0"
        style={{ backgroundColor: primaryColor + "15", borderColor: primaryColor + "30", color: primaryColor }}
        title={email}
      >
        {displayInitials}
      </div>

      {/* Console / Workspace Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-xl text-[10px] font-bold h-8 px-3 text-white hover:opacity-95 transition-all shadow-md cursor-pointer shrink-0"
        style={{ backgroundColor: primaryColor }}
      >
        {role === "Student" ? "Workspace" : "Console"}
      </Link>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="inline-flex items-center gap-1.5 rounded-xl text-[10px] font-bold h-8 px-2 sm:px-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20 cursor-pointer shrink-0"
        title="Logout"
      >
        <LogOut className="w-3 h-3" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
}
