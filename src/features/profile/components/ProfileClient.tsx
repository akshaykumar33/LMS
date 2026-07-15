"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Mail, Hash, Layers, Trophy, BadgeAlert, Calendar, 
  Sparkles, CheckCircle2, ChevronRight, Award, Flame, Star, Zap
} from "lucide-react";
import { StudentResumeWidget } from "@/features/career/components/StudentResumeWidget";
import { formatDate } from "@/utils/date-formatter";

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
  gamification: {
    xp: number;
    level: number;
    streak: number;
    badges: {
      id: string;
      name: string;
      desc: string;
      unlocked: boolean;
    }[];
    activityLogs: {
      text: string;
      xp: string;
      date: Date | string;
    }[];
  };
}

export function ProfileClient({ user, tenant, studentProfile, gamification }: ProfileClientProps) {
  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-screen bg-background shimmer-bg rounded-2xl" />;

  const { xp, level, streak, badges: dbBadges, activityLogs } = gamification;

  const badgeStyling: Record<string, { icon: React.ComponentType<any>; color: string }> = {
    pioneer: { icon: Sparkles, color: "text-sky-400 bg-sky-500/10 border-sky-500/25" },
    focus: { icon: Zap, color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
    streak: { icon: Flame, color: "text-rose-400 bg-rose-500/10 border-rose-500/25" },
    perfect: { icon: Trophy, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25" },
    graduate: { icon: Award, color: "text-purple-400 bg-purple-500/10 border-purple-500/25" }
  };

  const badges = dbBadges.map(b => {
    const style = badgeStyling[b.id] || { icon: Award, color: "text-purple-400 bg-purple-500/10 border-purple-500/25" };
    return {
      ...b,
      icon: style.icon,
      color: style.color
    };
  });

  const nextLevelXp = level * 250;
  const prevLevelXp = (level - 1) * 250;
  const progressPercent = Math.min(100, Math.max(0, ((xp - prevLevelXp) / 250) * 100));

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
              {activityLogs && activityLogs.length > 0 ? (
                activityLogs.map((act, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-foreground">{act.text}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(act.date)}</p>
                    </div>
                    <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
                      {act.xp}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-muted-foreground text-xs font-bold">
                  No gamification activity logs recorded yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
