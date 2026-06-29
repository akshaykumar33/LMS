"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Mail, Hash, Layers, Trophy, BadgeAlert, Calendar, 
  Sparkles, CheckCircle2, ChevronRight, Award, Flame, Star, Zap
} from "lucide-react";
import { StudentResumeWidget } from "@/features/career/components/StudentResumeWidget";

interface ProfileClientProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  tenant: {
    name: string;
    branding?: {
      primaryColor?: string;
    } | null;
  };
  studentProfile?: {
    id: string;
    rollNumber: string;
    admissionNumber: string;
    resumeUrl: string | null;
    batch?: {
      name: string;
    } | null;
  } | null;
}

export function ProfileClient({ user, tenant, studentProfile }: ProfileClientProps) {
  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";
  const [mounted, setMounted] = useState(false);

  // Load level and XP stats from localStorage (if exists, else fallback)
  const [xp, setXp] = useState(450);
  const [level, setLevel] = useState(3);
  const [streak, setStreak] = useState(5);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedXp = localStorage.getItem("student_xp");
      const savedLevel = localStorage.getItem("student_level");
      const savedStreak = localStorage.getItem("student_streak");

      if (savedXp) setXp(parseInt(savedXp));
      if (savedLevel) setLevel(parseInt(savedLevel));
      if (savedStreak) setStreak(parseInt(savedStreak));
    }
  }, []);

  // Static gamified achievements/badges
  const badges = [
    { id: "pioneer", name: "Pioneer Scholar", desc: "Successfully enrolled in the CoE batch.", unlocked: true, icon: Sparkles, color: "text-sky-400 bg-sky-500/10 border-sky-500/25" },
    { id: "focus", name: "Focus Master", desc: "Completed 1 focus Pomodoro session.", unlocked: true, icon: Zap, color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
    { id: "streak", name: "Daily Habit", desc: "Maintained a 5-day active study streak.", unlocked: true, icon: Flame, color: "text-rose-400 bg-rose-500/10 border-rose-500/25" },
    { id: "perfect", name: "Perfect Score", desc: "Earned 100% on any module quiz.", unlocked: xp >= 600, icon: Trophy, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25" },
    { id: "graduate", name: "Alumni Candidate", desc: "Passed all courses and unlocked certificates.", unlocked: false, icon: Award, color: "text-purple-400 bg-purple-500/10 border-purple-500/25" }
  ];

  // Simulated activity logging
  const recentActivities = [
    { text: "Completed 25-min Focus Pomodoro", xp: "+50 XP", date: "Today, 10:45 AM" },
    { text: "Checked off daily goal: Explain transistor sizing to AI", xp: "+15 XP", date: "Today, 9:30 AM" },
    { text: "Passed Quiz: CMOS Inverter Basics", xp: "+100 XP", date: "Yesterday" },
    { text: "Checked off daily goal: Solve practice quiz on CMOS", xp: "+15 XP", date: "Yesterday" }
  ];

  if (!mounted) return <div className="h-screen bg-background shimmer-bg rounded-2xl" />;

  const nextLevelXp = level * 200;
  const prevLevelXp = (level - 1) * 200;
  const progressPercent = ((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-black text-foreground">Student Profile</h1>
        <p className="text-xs text-muted-foreground">Manage your credentials, resumes, and check earned badges.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column (4 cols): User info card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-4xl mx-auto font-black text-primary">
                {user.firstName[0]}
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black text-foreground">{user.firstName} {user.lastName}</h2>
                <p className="text-[11px] text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {studentProfile ? (
              <div className="space-y-4 pt-4 border-t border-border/80">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs">
                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Roll Number</span>
                      <span className="font-mono font-bold text-foreground">{studentProfile.rollNumber}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Admission Code</span>
                      <span className="font-mono font-bold text-foreground">{studentProfile.admissionNumber}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Assigned Cohort</span>
                      <span className="font-bold text-foreground">{studentProfile.batch?.name || "General Batch"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-[9px] font-black uppercase text-muted-foreground block mb-2">Resume Credential</span>
                  <StudentResumeWidget 
                    initialResumeUrl={studentProfile.resumeUrl}
                    primaryColor={primaryColor}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-xs rounded-xl text-amber-500">
                No student profile details mapped.
              </div>
            )}
          </div>
        </div>

        {/* Right column (8 cols): Gamification & Stats */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Level progression card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Gamified Status</h3>
              <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                Rank: Advanced Apprentice
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Level</span>
                <p className="text-3xl font-black text-foreground">{level}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Total XP</span>
                <p className="text-3xl font-black text-foreground">{xp} XP</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Active Streak</span>
                <p className="text-3xl font-black text-foreground">{streak} Days</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                <span>{xp - prevLevelXp} XP in current level</span>
                <span>{nextLevelXp - xp} XP to Level {level + 1}</span>
              </div>
              <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Badges Cabinet chest */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Achievement Badges Cabinet</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {badges.map((b) => {
                const Icon = b.icon;
                return (
                  <div 
                    key={b.id} 
                    className={`p-4 border rounded-2xl flex gap-3.5 items-center transition-all ${
                      b.unlocked 
                        ? "bg-secondary/15 border-border/80 hover:border-slate-500 hover:shadow-md" 
                        : "bg-secondary/5 border-border/40 opacity-55 select-none"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${b.unlocked ? b.color : "bg-secondary text-muted-foreground"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-foreground truncate">{b.name}</h4>
                      <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">{b.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent activities logging */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Gamified Activity Logs</h3>
            <div className="divide-y divide-border/40">
              {recentActivities.map((act, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-foreground">{act.text}</p>
                    <p className="text-[10px] text-muted-foreground">{act.date}</p>
                  </div>
                  <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
                    {act.xp}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
