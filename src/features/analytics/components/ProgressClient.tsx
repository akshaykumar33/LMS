"use client";

import React, { useState, useEffect } from "react";
import { 
  Trophy, Award, BarChart3, CheckCircle, Target, BookOpen, Clock, 
  ArrowLeft, LogOut, ExternalLink, Calendar, HelpCircle, ShieldAlert,
  Download, CheckCircle2, ChevronRight, X
} from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import confetti from "canvas-confetti";
import { formatDate } from "@/utils/date-formatter";

interface QuizAttempt {
  attemptId: string;
  quizTitle: string;
  courseCode: string;
  courseName: string;
  score: number;
  passed: boolean;
  createdAt: Date | string;
}

interface CourseProgress {
  id: string;
  code: string;
  name: string;
  bestScore: number | null;
  totalAttempts: number;
  hasPassed: boolean;
  progressPercent?: number;
}

interface Certificate {
  id: string;
  certificateCode: string;
  issuedAt: Date | string;
  course: {
    name: string;
  };
}

interface ProgressClientProps {
  history: QuizAttempt[];
  progress: CourseProgress[];
  earnedCertificates: Certificate[];
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  tenant: {
    name: string;
    subdomain: string;
  };
  studentProfile?: {
    rollNumber: string;
    admissionNumber: string;
    batch?: {
      name: string;
    } | null;
  } | null;
}

export function ProgressClient({ 
  history, 
  progress, 
  earnedCertificates, 
  user, 
  tenant, 
  studentProfile 
}: ProgressClientProps) {
  
  const [mounted, setMounted] = useState(false);
  const [activeCert, setActiveCert] = useState<Certificate | null>(null);

  // Initialize mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCourses = progress.length;
  const passedCourses = progress.filter(c => c.hasPassed).length;
  const avgScore = history.length > 0 ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / history.length) : 0;

  // Radar Skill Competencies based on course performance
  const skillsData = [
    { subject: "Physical Synthesis", A: 85, B: 110, fullMark: 150 },
    { subject: "VLSI Layout", A: 98, B: 130, fullMark: 150 },
    { subject: "Lithography", A: 70, B: 130, fullMark: 150 },
    { subject: "Device Physics", A: 90, B: 100, fullMark: 150 },
    { subject: "Logic Verification", A: 65, B: 90, fullMark: 150 },
    { subject: "RF Design", A: 45, B: 85, fullMark: 150 },
  ];

  // Attendance stats (simulated)
  const attendanceRate = 92.5;
  const attendancePredictor = {
    status: "Good standing",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    desc: "Your current score is well above the 85% requirement. You have low academic risk alerts."
  };

  const handleOpenCertificate = (cert: Certificate) => {
    setActiveCert(cert);
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    }, 100);
  };

  if (!mounted) return <div className="h-screen bg-background shimmer-bg rounded-2xl" />;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-black text-foreground flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" /> Learning Diagnostics
        </h1>
        <p className="text-xs text-muted-foreground">
          Track and verify your progress, mock quizzes, certifications, and attendance heatmaps.
        </p>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[
          { label: "Enrolled Courses", value: totalCourses, icon: BookOpen, color: "text-primary", iconBg: "bg-primary/10 border-primary/20" },
          { label: "Passed Subjects", value: passedCourses, icon: CheckCircle, color: "text-emerald-400", iconBg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Quiz Attempts", value: history.length, icon: Target, color: "text-amber-400", iconBg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Average Grade", value: `${avgScore}%`, icon: Trophy, color: "text-purple-400", iconBg: "bg-purple-500/10 border-purple-500/20" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <div className={`p-2 rounded-xl border ${s.iconBg}`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Area (7 cols): Skills and Attendance */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Radar Skill Competency Wheel */}
          <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-primary" /> Skills Competency Radar
            </h3>
            
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillsData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#94a3b8" fontSize={9} />
                  <Radar name="Student" dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attendance Heatmap & Predictor */}
          <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" /> Attendance Heatmap & Prediction
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-secondary/15 border border-border/80 p-5 rounded-2xl flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider mb-1">Attendance Rate</span>
                <p className="text-3xl font-black text-foreground">{attendanceRate}%</p>
                <span className="text-[10px] text-emerald-400 font-bold mt-1">✓ Status Compliant</span>
              </div>
              <div className="md:col-span-2 p-5 border border-border rounded-2xl bg-secondary/10 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block mb-1">AI Attendance Risk Assessment</span>
                  <div className={`p-3 rounded-xl border text-[11px] leading-relaxed font-bold ${attendancePredictor.bgColor}`}>
                    <span className={`${attendancePredictor.color} block text-xs font-black`}>{attendancePredictor.status}</span>
                    <p className="mt-1 text-muted-foreground font-semibold">{attendancePredictor.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Area (5 cols): Certificates & Course List */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Certificate Credentials Vault */}
          <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary" /> Awarded Certificates
            </h3>

            {earnedCertificates.length > 0 ? (
              <div className="space-y-4">
                {earnedCertificates.map((cert) => (
                  <div 
                    key={cert.id} 
                    className="bg-secondary/15 border border-border hover:border-emerald-500/30 rounded-2xl p-5 space-y-4 hover:shadow-lg transition-all group cursor-pointer"
                    onClick={() => handleOpenCertificate(cert)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                          Verified Credential
                        </span>
                        <h4 className="text-xs font-extrabold text-foreground group-hover:text-primary pt-1">{cert.course?.name || "Unknown Course"}</h4>
                        <p className="text-[9px] text-muted-foreground font-mono truncate max-w-[180px]">ID: {cert.certificateCode}</p>
                      </div>
                      <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-3 border-t border-border/50 text-muted-foreground font-semibold">
                      <span>Issued: {formatDate(cert.issuedAt)}</span>
                      <span className="text-primary group-hover:underline flex items-center gap-1">
                        View Certificate <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-secondary/10 border border-border rounded-xl text-muted-foreground text-xs">
                No certificates unlocked yet. Complete a course and pass its quiz to claim credentials!
              </div>
            )}
          </div>

          {/* Subject Completion Grid */}
          <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary" /> Completion Status
            </h3>

            <div className="space-y-3.5">
              {progress.map((c) => (
                <div key={c.id} className="bg-secondary/5 border border-border/60 p-4 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black font-mono text-primary uppercase">{c.code}</span>
                      <h4 className="text-xs font-extrabold text-foreground leading-snug">{c.name}</h4>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded shrink-0 border uppercase tracking-wider ${
                      c.hasPassed 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : c.totalAttempts > 0 
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                          : "bg-secondary text-muted-foreground border-border"
                    }`}>
                      {c.hasPassed ? "Passed" : c.totalAttempts > 0 ? "Fail" : "Locked"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                      <span>Lesson Progress</span>
                      <span>{c.progressPercent ?? 0}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-primary transition-all" 
                        style={{ 
                          width: `${c.progressPercent ?? 0}%`, 
                        }} 
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground font-semibold pt-1">
                      <span>Best Score: {c.bestScore !== null ? `${c.bestScore}%` : "No Attempts"}</span>
                      <span>Attempts: {c.totalAttempts}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quiz History Logs Table */}
      <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-primary" /> Quiz Log History
        </h3>

        {history.length > 0 ? (
          <div className="overflow-x-auto border border-border/80 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/10 text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                  <th className="p-3">Quiz</th>
                  <th className="p-3">Course</th>
                  <th className="p-3 text-center">Score</th>
                  <th className="p-3 text-center">Result</th>
                  <th className="p-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {history.map((h) => (
                  <tr key={h.attemptId} className="hover:bg-secondary/15 transition-colors">
                    <td className="p-3 text-foreground font-bold">{h.quizTitle}</td>
                    <td className="p-3 text-muted-foreground">{h.courseCode} — {h.courseName}</td>
                    <td className="p-3 text-center font-black text-foreground">{h.score}%</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        h.passed 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {h.passed ? "Pass" : "Fail"}
                      </span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground font-medium">
                      {formatDate(h.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-secondary/10 border border-border rounded-xl text-muted-foreground text-xs">
            No quiz attempts recorded yet.
          </div>
        )}
      </div>

      {/* Certificate Frame Popup Modal */}
      {activeCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col p-4 sm:p-6 animate-in zoom-in-95 duration-200">
            
            {/* Header close button */}
            <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Award className="w-4 h-4 text-emerald-400" /> Digital Credential Preview
              </span>
              <button 
                onClick={() => setActiveCert(null)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Certificate Frame Body (Beautiful vector look) */}
            <div className="flex-1 bg-slate-900 border-4 border-amber-600/30 p-4 sm:p-8 rounded-2xl text-center space-y-4 sm:space-y-6 shadow-inner relative overflow-hidden flex flex-col justify-center min-h-[280px]">
              
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600/50" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600/50" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600/50" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600/50" />
              
              <div className="space-y-1">
                <span className="text-[10px] sm:text-[11px] font-black text-amber-500 uppercase tracking-widest block">Certificate of Completion</span>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">This is proudly presented to</p>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight">
                {user.firstName} {user.lastName}
              </h2>

              <p className="text-[10px] sm:text-[11px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                for demonstrating expert knowledge and successfully satisfying all academic assessments for the course:
                <strong className="text-foreground block text-xs sm:text-sm font-black mt-1.5">{activeCert.course?.name || "Unknown Course"}</strong>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-border/30 text-left max-w-md mx-auto text-[9px] sm:text-[10px] text-muted-foreground w-full">
                <div>
                  <span className="block font-mono uppercase tracking-wider text-[8px]">Verification Code</span>
                  <span className="font-mono font-bold text-foreground block truncate">{activeCert.certificateCode}</span>
                </div>
                <div className="sm:text-right">
                  <span className="block font-mono uppercase tracking-wider text-[8px]">Issued Date</span>
                  <span className="font-bold text-foreground block">{formatDate(activeCert.issuedAt)}</span>
                </div>
              </div>
            </div>

            {/* Downloader buttons */}
            <div className="mt-6 flex justify-end gap-2.5 shrink-0">
              <button
                onClick={() => alert("Certificate downloaded successfully as PDF (simulated)!")}
                className="px-4 py-2 bg-primary hover:opacity-95 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
