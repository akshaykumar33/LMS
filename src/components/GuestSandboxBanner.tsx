"use client";

import React from "react";

interface GuestSandboxBannerProps {
  role?: string;
}

export function GuestSandboxBanner({ role }: GuestSandboxBannerProps) {
  if (role !== "Guest") return null;

  return (
    <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-center py-2.5 px-4 text-xs font-bold shrink-0 shadow-md flex items-center justify-center gap-2 relative z-50">
      <span>⚠️</span>
      <span>
        <strong>Guest View-Only Access:</strong> You are currently exploring the system as a Guest. You can browse all dashboards (Student, Faculty, Admin, Placement) but state modifications are disabled.
      </span>
    </div>
  );
}
