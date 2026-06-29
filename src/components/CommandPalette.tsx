"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Compass, Book, BarChart2, Briefcase, User, Sparkles, LogOut, Moon, Sun, Trash2 } from "lucide-react";

interface CommandItem {
  name: string;
  category: string;
  icon: React.ComponentType<any>;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: Array<{ name: string; href: string; icon: React.ComponentType<any> }>;
}

export function CommandPalette({ isOpen, onClose, navigationItems }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens and manage body scroll
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Define commands
  const commands: CommandItem[] = [
    // Navigation Categories
    ...navigationItems.map(nav => ({
      name: `Go to ${nav.name}`,
      category: "Navigation",
      icon: nav.icon,
      action: () => {
        router.push(nav.href);
        onClose();
      }
    })),
    // Actions & Tools
    {
      name: "Toggle Color Theme",
      category: "System Actions",
      icon: Moon,
      action: () => {
        // Click the switcher element or simulate cookie updates
        const themeBtn = document.getElementById("theme-switcher-button");
        if (themeBtn) {
          themeBtn.click();
        } else {
          // Fallback toggle via cookie
          const currentCookie = document.cookie
            .split("; ")
            .find(row => row.startsWith("theme_mode="))
            ?.split("=")[1];
          const newTheme = currentCookie === "dark" ? "light" : "dark";
          document.cookie = `theme_mode=${newTheme}; path=/; max-age=31536000`;
          window.location.reload();
        }
        onClose();
      },
      shortcut: "T T"
    },
    {
      name: "Reset Study Analytics Cache",
      category: "Developer Tools",
      icon: Trash2,
      action: () => {
        if (confirm("Reset local study metrics, whiteboard doodles, and streak caches?")) {
          localStorage.removeItem("student_streak");
          localStorage.removeItem("student_xp");
          localStorage.removeItem("student_level");
          localStorage.removeItem("notebook_notes");
          localStorage.removeItem("whiteboard_drawing");
          localStorage.removeItem("pomodoro_sessions");
          localStorage.removeItem("pomodoro_total_time");
          alert("Storage caches cleared!");
          window.location.reload();
        }
        onClose();
      },
      shortcut: "D R"
    },
    {
      name: "Ask AI Assistant",
      category: "AI Learning",
      icon: Sparkles,
      action: () => {
        router.push("/courses");
        alert("Select any active lesson to open the Ask AI sidebar!");
        onClose();
      }
    }
  ];

  // Filter commands by query
  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  // Key navigation handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        ref={containerRef}
        className="w-full max-w-xl bg-card/90 border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[50vh] animate-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search portal..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-foreground border-none outline-none focus:ring-0 focus:border-none p-0 placeholder-muted-foreground"
          />
          <kbd className="bg-popover border border-border text-[9px] px-1.5 py-0.5 rounded font-mono font-bold text-muted-foreground shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2.5">
          {filteredCommands.length > 0 ? (
            <div className="space-y-4">
              {/* Categorize results */}
              {Array.from(new Set(filteredCommands.map(c => c.category))).map(category => (
                <div key={category} className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 px-3 py-1">
                    {category}
                  </div>
                  {filteredCommands
                    .filter(c => c.category === category)
                    .map((cmd) => {
                      // Get global index in filtered list
                      const globalIndex = filteredCommands.findIndex(c => c.name === cmd.name);
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = cmd.icon;

                      return (
                        <button
                          key={cmd.name}
                          onClick={cmd.action}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                            isSelected 
                              ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]" 
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                            <span className="text-xs font-bold">{cmd.name}</span>
                          </div>
                          {cmd.shortcut && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-border/40 ${
                              isSelected ? "bg-primary-hover text-white border-transparent" : "bg-popover text-muted-foreground"
                            }`}>
                              {cmd.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No matching commands or actions found. Try typing "Dashboard" or "Theme".
            </div>
          )}
        </div>

        {/* Help footer */}
        <div className="px-4 py-2 bg-secondary/30 border-t border-border/50 text-[9px] text-muted-foreground flex justify-between items-center font-medium">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Command Palette v1.0</span>
        </div>
      </div>
    </div>
  );
}
