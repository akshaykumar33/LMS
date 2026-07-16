"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, Trophy, Target, BookOpen, Clock, Play, Pause, RotateCcw, 
  Calendar, CheckSquare, Sparkles, ChevronRight, Video, FileText, Plus, Trash2, Award, Zap
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import confetti from "canvas-confetti";
import { useGamificationStore } from "@/store";

interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface DashboardClientProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  tenant: {
    name: string;
    subdomain: string;
    branding?: {
      primaryColor?: string;
      companyName?: string;
    } | null;
  };
  studentProfile?: {
    rollNumber: string;
    admissionNumber: string;
    batch?: {
      name: string;
    } | null;
  } | null;
  courses: Course[];
}

export function DashboardClient({ user, tenant, studentProfile, courses }: DashboardClientProps) {
  const primaryColor = tenant.branding?.primaryColor || "#0ea5e9";
  const tenantDisplayName = tenant.branding?.companyName || tenant.name;
  const [mounted, setMounted] = useState(false);

  // Toast notification state (replaces native alert())
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);
  const showToast = (message: string, icon = "🎉") => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3500);
  };

  // Gamification & Streak Store State
  const { xp, level, streakCount: streak, awardXP } = useGamificationStore();
  
  // Pomodoro Local State
  const [pTime, setPTime] = useState(1500); // 25 min default
  const [pActive, setPActive] = useState(false);
  const [pMode, setPMode] = useState<"work" | "break">("work");
  const pInterval = useRef<NodeJS.Timeout | null>(null);

  // Daily Tasks State
  const [goals, setGoals] = useState<Array<{ id: string; text: string; done: boolean }>>([
    { id: "1", text: "Complete 1 video lesson on semiconductor physics", done: false },
    { id: "2", text: "Solve practice quiz on CMOS inverter", done: true },
    { id: "3", text: "Explain transistor sizing to AI Assistant", done: false }
  ]);
  const [newGoalText, setNewGoalText] = useState("");

  // Hydration safety mount check
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedGoals = localStorage.getItem("student_goals");
      if (savedGoals) setGoals(JSON.parse(savedGoals));
    }
  }, []);

  // Persist goals on changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("student_goals", JSON.stringify(goals));
    }
  }, [goals, mounted]);

  // Pomodoro tick timer
  useEffect(() => {
    if (pActive) {
      pInterval.current = setInterval(() => {
        setPTime((prev) => {
          if (prev <= 1) {
            // Timer finished
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pInterval.current) clearInterval(pInterval.current);
    }

    return () => {
      if (pInterval.current) clearInterval(pInterval.current);
    };
  }, [pActive, pMode]);

  const handleTimerComplete = () => {
    setPActive(false);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 }
    });

    if (pMode === "work") {
      // Award XP
      const addedXp = 50;
      const newLevel = Math.floor((xp + addedXp) / 100) + 1;
      const levelUp = newLevel > level;

      awardXP(addedXp);

      if (levelUp) {
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 100,
            colors: ["#FFD700", "#FF4500"]
          });
          showToast(`Level Up! You reached Level ${newLevel}!`, "🏆");
        }, 800);
      } else {
        showToast(`Focus session complete! +${addedXp} XP earned`, "🍅");
      }

      // Switch to break
      setPMode("break");
      setPTime(300); // 5 min break
    } else {
      showToast("Break finished! Ready to focus?", "☕");
      setPMode("work");
      setPTime(1500); // 25 min work
    }
  };

  const togglePomodoro = () => {
    setPActive(!pActive);
  };

  const resetPomodoro = () => {
    setPActive(false);
    setPTime(pMode === "work" ? 1500 : 300);
  };

  const skipPomodoro = () => {
    setPActive(false);
    setPMode(pMode === "work" ? "break" : "work");
    setPTime(pMode === "work" ? 300 : 1500);
  };

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
    
    // Add micro XP for completing goal
    const goal = goals.find(g => g.id === id);
    if (goal && !goal.done) {
      awardXP(15);
      confetti({ particleCount: 20, spread: 30, origin: { y: 0.8 } });
    }
  };

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    setGoals(prev => [...prev, { id: Date.now().toString(), text: newGoalText.trim(), done: false }]);
    setNewGoalText("");
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Recharts simulated weekly statistics
  const chartData = [
    { name: "Mon", Hours: 2.2 },
    { name: "Tue", Hours: 3.5 },
    { name: "Wed", Hours: 1.8 },
    { name: "Thu", Hours: 4.2 },
    { name: "Fri", Hours: 2.5 },
    { name: "Sat", Hours: 5.0 },
    { name: "Sun", Hours: 1.0 }
  ];

  // Calendar contribution cells (12 weeks * 7 days)
  const heatmapWeeks = 12;
  const heatmapDays = 7;
  const generateHeatmap = () => {
    const cells: any[] = [];
    // Use user email as seed for per-user randomization
    let seed = 0;
    for (let c = 0; c < user.email.length; c++) seed += user.email.charCodeAt(c);
    for (let i = 0; i < heatmapWeeks * heatmapDays; i++) {
      seed = (seed * 16807 + 12345) % 2147483647;
      const level = seed % 5;
      cells.push({ id: i, level });
    }
    return cells;
  };

  // Live countdown to mock class
  const upcomingClass = {
    title: "Intro to VLSI Physical Synthesis",
    instructor: "Dr. Rachel Green",
    time: "Today, 3:00 PM (In 1.5 hours)",
    url: "https://zoom.us/mock-room-id"
  };

  if (!mounted) return (
    <div className="space-y-8 animate-pulse">
      <div className="h-36 bg-secondary/30 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="h-28 bg-secondary/20 rounded-2xl" />
          <div className="h-64 bg-secondary/20 rounded-2xl" />
          <div className="h-72 bg-secondary/20 rounded-2xl" />
        </div>
        <div className="lg:col-span-4 space-y-8">
          <div className="h-40 bg-secondary/20 rounded-2xl" />
          <div className="h-48 bg-secondary/20 rounded-2xl" />
          <div className="h-32 bg-secondary/20 rounded-2xl" />
        </div>
      </div>
    </div>
  );

  // Calculate XP progress percentage
  const nextLevelXp = level * 200;
  const prevLevelXp = (level - 1) * 200;
  const levelProgress = ((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Command Center</span>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground">
            Welcome Back, {user.firstName}! 🚀
          </h1>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            You're completing courses in the <strong className="text-foreground">{tenantDisplayName}</strong> curriculum. Check your schedule and lock in study goals below.
          </p>
        </div>

        {/* Dynamic Streak Badge */}
        <div className="flex items-center gap-4 bg-card border border-border/80 px-5 py-4 rounded-2xl shadow-md shrink-0">
          <div className="relative">
            <div className="absolute -inset-1 bg-amber-500 rounded-full blur opacity-30 animate-pulse" />
            <div className="relative w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Learning Streak</p>
            <p className="text-base font-extrabold text-foreground">{streak} Days Active</p>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Courses & Analytics */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Continue Learning Widget */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Continue Learning
            </h3>

            {courses.length > 0 ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-secondary/20 p-5 rounded-xl border border-border/40">
                <div className="space-y-1.5">
                  <span className="bg-primary/20 text-primary border border-primary/20 text-[9px] font-black px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    {courses[0].code}
                  </span>
                  <h4 className="text-sm font-extrabold text-foreground leading-snug">{courses[0].name}</h4>
                  <p className="text-[11px] text-muted-foreground">Last Session: Module 2 — Silicon Lithography Basics</p>
                </div>
                <a
                  href={`/courses/${courses[0].id}`}
                  className="bg-primary text-white text-xs font-black h-10 px-5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20 hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  Resume Workspace <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No active courses assigned. Check in with the admins!
              </div>
            )}
          </div>

          {/* Enrolled Courses Grid */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Active Cohort Courses
            </h3>

            {courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.map((course, idx) => {
                  const simulatedLessons = 6 + (idx * 3) % 12;
                  const simulatedProgress = Math.min(92, Math.max(8, ((idx * 37 + 15) % 75) + 12));
                  return (
                  <div 
                    key={course.id}
                    className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 transition-all flex flex-col justify-between relative group overflow-hidden"
                  >
                    <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl group-hover:scale-125 transition-all duration-500 pointer-events-none" style={{ background: `radial-gradient(circle, ${primaryColor}15, transparent)` }} />
                    <div className="space-y-3 relative z-10">
                      <div className="flex justify-between items-center">
                        <span className="bg-primary/10 border border-primary/20 text-primary text-[9px] font-black px-2 py-0.5 rounded font-mono uppercase">
                          {course.code}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">{simulatedLessons} Lessons</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-foreground leading-snug group-hover:text-primary transition-colors">
                        {course.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {course.description}
                      </p>
                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                          <span>Progress</span>
                          <span>{simulatedProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary/40 border border-border/20 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 relative"
                            style={{ width: `${simulatedProgress}%`, background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}bb)` }}
                          >
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 blur-[1px] animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <a
                      href={`/courses/${course.id}`}
                      className="mt-5 relative z-10 bg-secondary/40 border border-border/80 text-foreground hover:bg-primary hover:text-white hover:border-transparent text-[11px] font-extrabold h-9 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer group-hover:border-primary/40 group-hover:text-primary hover:group-hover:text-white!"
                    >
                      Enter Workspace <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground max-w-xs">No active courses assigned to your cohort yet. Check back soon!</p>
              </div>
            )}
          </div>

          {/* Analytics Weekly Study Log */}
          <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Study Hours Analysis
                </h3>
                <p className="text-[10px] text-muted-foreground font-semibold">Weekly Total: <strong className="text-foreground">20.2 Hours</strong></p>
              </div>
              <div className="flex gap-2">
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block">Weekly Goal</span>
                  <span className="text-xs font-black text-emerald-400">84% Met</span>
                </div>
              </div>
            </div>

            {/* Quick mini metrics */}
            <div className="grid grid-cols-3 gap-4 bg-muted/15 p-3.5 rounded-xl border border-border/40 text-center">
              <div>
                <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-500 block">Avg / Day</span>
                <span className="text-xs font-extrabold text-foreground mt-0.5 block">2.9h</span>
              </div>
              <div className="border-x border-border/45">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-500 block">Active Days</span>
                <span className="text-xs font-extrabold text-foreground mt-0.5 block">6 / 7</span>
              </div>
              <div>
                <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-500 block">Streak</span>
                <span className="text-xs font-extrabold text-foreground mt-0.5 block">12 Days</span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="studyBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryColor} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={primaryColor} stopOpacity={0.15}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    className="font-semibold"
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    className="font-semibold"
                  />
                  <Tooltip 
                    cursor={{ fill: "rgba(255,255,255,0.02)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950/90 backdrop-blur-md border border-primary/25 rounded-xl p-2.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                            <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">{payload[0].payload.name}</p>
                            <p className="text-xs font-extrabold mt-0.5" style={{ color: primaryColor }}>
                              {payload[0].value} Hours Focused
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Hours" fill="url(#studyBarGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Profile Levels, Pomodoro, Heatmap */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Level Progression */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Academics Mastery</span>
              <div className="flex items-center gap-1 text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                <Trophy className="w-3 h-3" />
                <span>Level {level}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative shrink-0 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-white font-extrabold text-lg shadow-md">
                L{level}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-foreground">Next Rank: Senior Apprentice</p>
                <p className="text-[10px] text-muted-foreground">{xp} / {nextLevelXp} XP Completed</p>
              </div>
            </div>

            {/* XP bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500" 
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                <span>{xp - prevLevelXp} XP earned</span>
                <span>{nextLevelXp - xp} XP to go</span>
              </div>
            </div>
          </div>

          {/* Pomodoro Timer Card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl" />
            
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Focus Pomodoro
              </h3>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${pMode === "work" ? "bg-red-500/10 text-red-400 border-red-500/25" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"}`}>
                {pMode} mode
              </span>
            </div>

            {/* Sexy Timer Vis (Circular SVG) */}
            <div className="relative flex items-center justify-center py-4">
              <svg className="w-36 h-36">
                {/* Background Ring */}
                <circle
                  className="text-secondary/30"
                  strokeWidth="5"
                  stroke="currentColor"
                  fill="transparent"
                  r="62"
                  cx="72"
                  cy="72"
                />
                {/* Active Ring */}
                <circle
                  className="pomodoro-ring-circle"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={2 * Math.PI * 62 * (1 - pTime / (pMode === "work" ? 1500 : 300))}
                  strokeLinecap="round"
                  stroke={pMode === "work" ? "#ef4444" : "#10b981"}
                  fill="transparent"
                  r="62"
                  cx="72"
                  cy="72"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center space-y-0.5">
                <span className="text-2xl font-black text-foreground font-mono tracking-tight text-glow">
                  {formatTime(pTime)}
                </span>
                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">
                  {pMode === "work" ? "Focus" : "Break"}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={togglePomodoro}
                className="w-10 h-10 rounded-xl bg-primary hover:opacity-95 text-white flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-105 neon-btn-primary"
                style={{ backgroundColor: primaryColor }}
              >
                {pActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>
              <button
                onClick={resetPomodoro}
                className="w-9 h-9 rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={skipPomodoro}
                className="w-9 h-9 rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                title="Skip to next session"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Video className="w-4 h-4 text-primary" /> Today's Live Class
            </h3>
            
            <div className="bg-secondary/20 p-4 rounded-xl border border-border/40 space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-foreground leading-snug">{upcomingClass.title}</h4>
                <p className="text-[10px] text-muted-foreground">{upcomingClass.instructor}</p>
                <p className="text-[10px] font-bold text-primary pt-0.5">{upcomingClass.time}</p>
              </div>
              <a 
                href={upcomingClass.url}
                target="_blank" 
                rel="noreferrer"
                className="w-full h-8 bg-primary hover:opacity-95 text-white text-[10px] font-black rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <Video className="w-3 h-3" /> Join Zoom Lecture
              </a>
            </div>
          </div>

          {/* Daily Goals List */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-primary" /> Daily Planner
            </h3>

            <form onSubmit={addGoal} className="flex gap-2">
              <input
                type="text"
                placeholder="Add daily study goal..."
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                className="flex-1 bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-[11px] text-foreground focus:outline-none"
              />
              <button
                type="submit"
                className="p-1.5 bg-primary text-white rounded-lg hover:opacity-95 cursor-pointer text-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/10 border border-border/40 hover:bg-secondary/20 transition-all">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0 mr-2">
                    <input
                      type="checkbox"
                      checked={g.done}
                      onChange={() => toggleGoal(g.id)}
                      className="mt-0.5 rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 shrink-0 cursor-pointer"
                      style={{ accentColor: primaryColor }}
                    />
                    <span className={`text-[11px] leading-snug break-words ${g.done ? "line-through text-muted-foreground font-medium" : "text-foreground font-bold"}`}>
                      {g.text}
                    </span>
                  </div>
                  <button 
                    onClick={() => deleteGoal(g.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Heatmap Widget */}
          <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Study Heatmap
              </h3>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest bg-muted/15 px-2 py-0.5 rounded border border-border/40">12 Week View</span>
            </div>
            
            <div className="flex gap-2 items-start justify-center pt-2">
              {/* Day Labels Column */}
              <div className="flex flex-col gap-1 text-[8.5px] text-muted-foreground font-black pr-1 select-none pt-4">
                <span className="w-6 h-3.5 flex items-center justify-end">Mon</span>
                <span className="w-6 h-3.5 flex items-center justify-end text-transparent">Tue</span>
                <span className="w-6 h-3.5 flex items-center justify-end">Wed</span>
                <span className="w-6 h-3.5 flex items-center justify-end text-transparent">Thu</span>
                <span className="w-6 h-3.5 flex items-center justify-end">Fri</span>
                <span className="w-6 h-3.5 flex items-center justify-end text-transparent">Sat</span>
                <span className="w-6 h-3.5 flex items-center justify-end text-transparent">Sun</span>
              </div>

              {/* Weeks Grid */}
              <div className="flex-1 flex gap-1 overflow-x-auto pb-1 scrollbar-none relative pt-4 justify-between">
                {(() => {
                  const weeks: any[] = [];
                  const hData = generateHeatmap();
                  for (let w = 0; w < heatmapWeeks; w++) {
                    weeks.push(hData.slice(w * heatmapDays, (w + 1) * heatmapDays));
                  }
                  return weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1 relative">
                      {/* Month label positioning */}
                      {wIdx % 4 === 0 && (
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest absolute -top-4 left-0 whitespace-nowrap">
                          {wIdx === 0 ? "Apr" : wIdx === 4 ? "May" : "Jun"}
                        </span>
                      )}
                      {week.map((cell) => {
                        const getStyle = () => {
                          if (cell.level === 0) return { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" };
                          const opacities = [0.25, 0.5, 0.75, 0.95];
                          const opacity = opacities[cell.level - 1] || 0.5;
                          return {
                            backgroundColor: primaryColor,
                            opacity: opacity,
                            borderColor: `${primaryColor}20`,
                            boxShadow: cell.level >= 3 ? `0 0 6px 1px ${primaryColor}40` : 'none'
                          };
                        };
                        return (
                          <div
                            key={cell.id}
                            className="w-3.5 h-3.5 rounded-[2px] border cursor-pointer transition-all hover:scale-125 hover:z-10"
                            style={getStyle()}
                            title={`Study level ${cell.level} (Jun ${1 + cell.id % 28})`}
                          />
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold pt-1 border-t border-border/40">
              <span>Less consistent</span>
              <div className="flex gap-1 items-center">
                <div className="w-2.5 h-2.5 rounded-[2px] border" style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)" }} />
                <div className="w-2.5 h-2.5 rounded-[2px] border" style={{ backgroundColor: primaryColor, opacity: 0.25, borderColor: `${primaryColor}20` }} />
                <div className="w-2.5 h-2.5 rounded-[2px] border" style={{ backgroundColor: primaryColor, opacity: 0.5, borderColor: `${primaryColor}20` }} />
                <div className="w-2.5 h-2.5 rounded-[2px] border" style={{ backgroundColor: primaryColor, opacity: 0.75, borderColor: `${primaryColor}20` }} />
                <div className="w-2.5 h-2.5 rounded-[2px] border" style={{ backgroundColor: primaryColor, opacity: 0.95, borderColor: `${primaryColor}20` }} />
                <span className="ml-1">More consistent</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Toast Notification Overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-card border border-border rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-3 max-w-sm">
            <span className="text-lg">{toast.icon}</span>
            <p className="text-xs font-bold text-foreground">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
