"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read theme mode from cookie
    const cookies = document.cookie.split(";");
    const modeCookie = cookies.find((c) => c.trim().startsWith("theme_mode="));
    if (modeCookie) {
      setThemeMode(modeCookie.split("=")[1].trim() as "light" | "dark");
    } else {
      // Check legacy theme_set
      const setCookie = cookies.find((c) => c.trim().startsWith("theme_set="));
      if (setCookie) {
        setThemeMode("dark");
      }
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    // Set cookie that lasts 1 year
    document.cookie = `theme_mode=${nextMode}; path=/; max-age=31536000; SameSite=Lax`;
    // Also set theme_set to avoid conflicts
    document.cookie = `theme_set=${nextMode}; path=/; max-age=31536000; SameSite=Lax`;
    setThemeMode(nextMode);
    
    // Reload page to apply SSR styles
    window.location.reload();
  };

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl border border-border bg-card animate-pulse" />
    );
  }

  const isDark = themeMode === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card hover:bg-secondary/85 hover:border-ring/30 transition-all duration-300 text-foreground cursor-pointer shadow-sm relative overflow-hidden group"
      aria-label="Toggle light/dark mode"
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 rotate-0 transition-transform duration-500 group-hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 rotate-0 transition-transform duration-500 group-hover:-rotate-12" />
      )}
    </button>
  );
}
