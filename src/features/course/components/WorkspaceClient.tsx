"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, Video, FileText, ChevronLeft, ChevronRight, Sparkles, 
  Edit3, HelpCircle, MessageSquare, Award, Play, CheckCircle, 
  Send, RefreshCw, Download, Award as BadgeIcon, BrainCircuit, ShieldAlert,
  HelpCircle as QuestionIcon, Volume2, VolumeX, Pause, RotateCcw, RotateCw, Maximize,
  Lock, Unlock
} from "lucide-react";
import confetti from "canvas-confetti";
import { QuizWorkspace } from "@/features/quiz/components/QuizWorkspace";
import { toggleLessonCompletionAction, submitProjectAction, askAiAction, updateStudentCompetencyAction } from "../actions/course-actions";
import { submitSubjectiveAction } from "../actions/subjective-actions";
import { saveScormAttemptAction, getScormProgressAction, saveScormCourseAttemptAction, getScormCourseProgressAction } from "../actions/scorm-actions";
import { formatReadableDate } from "@/utils/date-formatter";

interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  contentType: string;
  content: string | null;
  videoUrl: string | null;
  zoomMeetingId?: string | null;
  zoomPasscode?: string | null;
  fileUrl?: string | null;
  difficulty?: string;
}

interface Module {
  id: string;
  name: string;
  lessons: Lesson[];
}

interface CourseDetails {
  id: string;
  code: string;
  name: string;
  description: string | null;
  syllabus: string | null;
  scormEnabled?: boolean;
  scormPackageUrl?: string | null;
  unlockPolicy?: string | null;
  modules: Module[];
}

interface QuizItem {
  id: string;
  title: string;
  lessonId: string | null;
}

interface WorkspaceClientProps {
  course: CourseDetails;
  quizzes: QuizItem[];
  activeLesson: Lesson | null;
  activeQuiz: any | null;
  completedLessonIds: string[];
  scormCourseProgress?: any | null;
  capstoneProject?: any | null;
  capstoneSubmission?: any | null;
  subjectiveSubmissions?: any[];
  tenantName: string;
  subdomain: string;
  primaryColor?: string;
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    role?: string;
  };
  enableProctoring?: boolean;
  enableAi?: boolean;
  enableCapstone?: boolean;
}

function renderFormattedContent(text: string, primaryColor: string) {
  // 1. Detect if it is Score Bot report card format
  if (text.includes("Score Bot Report Card") || text.includes("🎯 **Score Bot Report Card**")) {
    const studentMatch = text.match(/Student\*+:\s*(.*)/i);
    const rollMatch = text.match(/Roll Number\*+:\s*(.*)/i);
    const progressMatch = text.match(/Roadmap Progress\*+:\s*(\d+)\/(\d+)/i);
    const quizzesMatch = text.match(/Quizzes Attempted\*+:\s*(\d+)\s*\|\s*Passed:\s*(\d+)/i);
    const scoreMatch = text.match(/Average Quiz Score\*+:\s*(\d+)%/i);
    const integrityMatch = text.match(/Proctor Integrity Status\*+:\s*(\d+)\s*warnings\s*\(([^)]+)\)/i);
    
    const recIndex = text.indexOf("Recommendation");
    let recommendation = "";
    if (recIndex !== -1) {
      recommendation = text.substring(recIndex + 14).replace(/^[:\-\s\n*]+/g, "").trim();
    }

    const studentName = studentMatch ? studentMatch[1].trim() : "Student";
    const rollNumber = rollMatch ? rollMatch[1].trim() : "N/A";
    const compLessons = progressMatch ? parseInt(progressMatch[1]) : 0;
    const totalLessons = progressMatch ? parseInt(progressMatch[2]) : 6;
    const progressPercent = totalLessons > 0 ? Math.round((compLessons / totalLessons) * 100) : 0;
    const quizCount = quizzesMatch ? parseInt(quizzesMatch[1]) : 0;
    const quizPassed = quizzesMatch ? parseInt(quizzesMatch[2]) : 0;
    const avgScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    const warnings = integrityMatch ? parseInt(integrityMatch[1]) : 0;
    const status = integrityMatch ? integrityMatch[2].trim() : "CLEAR";

    const isFlagged = status.includes("FLAG") || warnings > 1;

    return (
      <div className="space-y-3.5 font-sans text-[11px] bg-card border border-border p-4 rounded-xl shadow-lg relative overflow-hidden text-left">
        <div 
          className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
          style={{ backgroundColor: primaryColor }}
        />
        
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🎯</span>
            <span className="font-extrabold text-foreground tracking-wide uppercase text-[9px]">Score Bot Analytics</span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border whitespace-nowrap ${
            isFlagged 
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" 
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
          }`}>
            <span className="text-[9px] leading-none">{isFlagged ? "⚠️" : "✅"}</span>
            <span>{isFlagged ? "FLAG AUDIT" : "CLEAR"}</span>
          </span>
        </div>

        {/* Student Metadata */}
        <div className="flex flex-col gap-1.5 text-[9.5px] bg-secondary/15 p-2.5 rounded-lg border border-border/20">
          <div className="flex justify-between items-center gap-4">
            <span className="text-muted-foreground font-medium">Student</span>
            <strong className="text-foreground font-bold truncate max-w-[170px]" title={studentName}>{studentName}</strong>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-muted-foreground font-medium">Roll Number</span>
            <strong className="text-foreground font-bold font-mono">{rollNumber}</strong>
          </div>
        </div>

        {/* Roadmap Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9.5px]">
            <span className="font-bold text-muted-foreground">Course Completion</span>
            <span className="font-black text-foreground">{compLessons}/{totalLessons} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-secondary/35 h-1.5 rounded-full overflow-hidden border border-border/40">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
            />
          </div>
        </div>

        {/* Analytical Grid widgets */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Average quiz score widget */}
          <div className="bg-secondary/10 border border-border/30 p-2.5 rounded-xl flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-[8.5px] font-extrabold text-muted-foreground uppercase tracking-wider">Average Score</span>
            <div className="relative flex items-center justify-center my-0.5">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="rgba(156, 163, 175, 0.25)" strokeWidth="2.5" fill="transparent" />
                <circle cx="20" cy="20" r="16" stroke={primaryColor} strokeWidth="2.5" fill="transparent" 
                        strokeDasharray={100.5} strokeDashoffset={100.5 - (100.5 * Math.min(avgScore, 100)) / 100} />
              </svg>
              <span className="absolute text-[9.5px] font-black text-foreground">{avgScore}%</span>
            </div>
          </div>

          {/* Assessment metrics */}
          <div className="bg-secondary/10 border border-border/30 p-2.5 rounded-xl flex flex-col justify-between text-left space-y-1">
            <div>
              <span className="text-[8.5px] font-extrabold text-muted-foreground uppercase tracking-wider block">Quizzes</span>
              <div className="text-base font-black text-foreground mt-0.5">{quizCount}</div>
              <span className="text-[8.5px] text-muted-foreground font-semibold">Attempted</span>
            </div>
            <div className="border-t border-border/20 pt-1 mt-1 flex justify-between items-center text-[8.5px]">
              <span className="text-muted-foreground">Passed:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{quizPassed}</strong>
            </div>
          </div>
        </div>

        {/* Integrity status info */}
        {warnings > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-2 rounded-lg text-[9px] leading-relaxed flex items-start gap-1">
            <span className="text-xs shrink-0">⚠️</span>
            <div>
              <strong>Security Warnings:</strong> {warnings} warning(s) flagged. Keep camera aligned to workspace.
            </div>
          </div>
        )}

        {/* AI recommendation panel */}
        {recommendation && (
          <div 
            className="border-l-2 p-2.5 rounded-r-lg text-[9.5px] leading-relaxed mb-2" 
            style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}10` }}
          >
            <span className="font-extrabold text-foreground uppercase tracking-wider block text-[7.5px] mb-1 opacity-70">AI Coach Advice</span>
            <span className="text-muted-foreground font-medium">{recommendation}</span>
          </div>
        )}

        {/* View & Download Scorecard Button */}
        <button
          onClick={() => {
            if (typeof window !== "undefined" && (window as any).__showScorecard) {
              (window as any).__showScorecard(studentName, avgScore);
            }
          }}
          className="w-full py-2.5 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          🏆 View & Download Career Scorecard
        </button>
      </div>
    );
  }

  // 2. Otherwise render standard formatted markdown lines
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 font-sans leading-relaxed text-left">
      {lines.map((line, lIdx) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1" />;

        // Handle Horizontal rule
        if (trimmed === "---" || trimmed === "***" || trimmed.startsWith("---")) {
          return <hr key={lIdx} className="my-2 border-border/40" />;
        }

        // Handle Header tags
        if (trimmed.startsWith("### ")) {
          return <h4 key={lIdx} className="text-xs font-black text-foreground mt-2 mb-1">{trimmed.substring(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={lIdx} className="text-sm font-extrabold text-foreground mt-3 mb-1">{trimmed.substring(3)}</h3>;
        }

        // Handle list bullet item
        const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*");
        if (isBullet) {
          trimmed = trimmed.substring(1).trim();
        }

        // Format inline items: bold **, links [](), inline code/math formulas $
        const formattedNodes: React.ReactNode[] = [];
        let cursor = 0;

        while (cursor < trimmed.length) {
          if (trimmed.startsWith("**", cursor)) {
            const nextIdx = trimmed.indexOf("**", cursor + 2);
            if (nextIdx !== -1) {
              formattedNodes.push(
                <strong key={cursor} className="font-bold text-foreground">
                  {trimmed.substring(cursor + 2, nextIdx)}
                </strong>
              );
              cursor = nextIdx + 2;
              continue;
            }
          }

          if (trimmed.startsWith("[", cursor)) {
            const closingBracket = trimmed.indexOf("]", cursor + 1);
            if (closingBracket !== -1 && trimmed.startsWith("(", closingBracket + 1)) {
              const closingParen = trimmed.indexOf(")", closingBracket + 2);
              if (closingParen !== -1) {
                const linkText = trimmed.substring(cursor + 1, closingBracket);
                const linkUrl = trimmed.substring(closingBracket + 2, closingParen);
                formattedNodes.push(
                  <a
                    key={cursor}
                    href={linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:opacity-85 font-black"
                    style={{ color: primaryColor }}
                  >
                    {linkText}
                  </a>
                );
                cursor = closingParen + 1;
                continue;
              }
            }
          }

          if (trimmed.startsWith("$", cursor)) {
            const closingMath = trimmed.indexOf("$", cursor + 1);
            if (closingMath !== -1) {
              formattedNodes.push(
                <code key={cursor} className="bg-secondary/40 px-1 py-0.5 rounded text-[10px] font-mono text-amber-400 font-bold">
                  {trimmed.substring(cursor + 1, closingMath)}
                </code>
              );
              cursor = closingMath + 1;
              continue;
            }
          }

          formattedNodes.push(trimmed[cursor]);
          cursor++;
        }

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-3 py-0.5 text-[11px]">
              <span className="text-primary font-bold shrink-0 mt-0.5" style={{ color: primaryColor }}>•</span>
              <span className="text-muted-foreground flex-1">{formattedNodes}</span>
            </div>
          );
        }

        return (
          <p key={lIdx} className="text-muted-foreground text-[11px]">
            {formattedNodes}
          </p>
        );
      })}
    </div>
  );
}

/** Inline SCORM iframe + API bridge. No standalone player component needed. */
function ScormInlinePlayer({
  lessonId,
  courseId,
  isCourseLevel = false,
  fileUrl,
  userName,
  userId,
  onComplete,
  onScormDataUpdate,
}: {
  lessonId?: string;
  courseId?: string;
  isCourseLevel?: boolean;
  fileUrl: string | null;
  userName: string;
  userId: string;
  onComplete?: () => void;
  onScormDataUpdate?: (data: any) => void;
}) {
  const stateRef = useRef<Record<string, string>>({});
  const sessionStartRef = useRef<number>(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionStartRef.current = Date.now();

    // Load existing progress then bind APIs
    (async () => {
      setLoading(true);
      const res = isCourseLevel && courseId
        ? await getScormCourseProgressAction(courseId)
        : await getScormProgressAction(lessonId!);
      if (res.success && res.data) {
        stateRef.current = res.data as Record<string, string>;
      } else {
        stateRef.current = {};
      }

      // Pre-populate learner identity
      stateRef.current["cmi.core.student_id"] = stateRef.current["cmi.core.student_id"] || userId;
      stateRef.current["cmi.core.student_name"] = stateRef.current["cmi.core.student_name"] || userName;
      stateRef.current["cmi.learner_id"] = stateRef.current["cmi.learner_id"] || userId;
      stateRef.current["cmi.learner_name"] = stateRef.current["cmi.learner_name"] || userName;

      setLoading(false);
    })();

    const persistState = async () => {
      // Calculate and inject elapsed session time
      const elapsedSec = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const prev = parseInt(stateRef.current["_total_time_seconds"] || "0", 10);
      stateRef.current["_total_time_seconds"] = String(prev + elapsedSec);
      sessionStartRef.current = Date.now(); // reset for next commit

      const result = isCourseLevel && courseId
        ? await saveScormCourseAttemptAction(courseId, { ...stateRef.current })
        : await saveScormAttemptAction(lessonId!, { ...stateRef.current });
      if (result.success) {
        if (onScormDataUpdate) {
          onScormDataUpdate(stateRef.current);
        }
        if (onComplete) {
          const status = stateRef.current["cmi.core.lesson_status"] || stateRef.current["cmi.completion_status"] || "";
          const success = stateRef.current["cmi.success_status"] || "";
          if (["completed", "passed"].includes(status.toLowerCase()) || success.toLowerCase() === "passed") {
            onComplete();
          }
        }
      }
    };

    // SCORM 1.2 API
    (window as any).API = {
      LMSInitialize: () => "true",
      LMSFinish: () => { persistState(); return "true"; },
      LMSGetValue: (el: string) => stateRef.current[el] || "",
      LMSSetValue: (el: string, val: string) => { stateRef.current[el] = val; return "true"; },
      LMSCommit: () => { persistState(); return "true"; },
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "No error",
      LMSGetDiagnostic: () => "",
    };

    // SCORM 2004 API
    (window as any).API_1484_11 = {
      Initialize: () => "true",
      Terminate: () => { persistState(); return "true"; },
      GetValue: (el: string) => stateRef.current[el] || "",
      SetValue: (el: string, val: string) => { stateRef.current[el] = val; return "true"; },
      Commit: () => { persistState(); return "true"; },
      GetLastError: () => "0",
      GetErrorString: () => "No error",
      GetDiagnostic: () => "",
    };

    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [lessonId, courseId, isCourseLevel]);

  if (loading) {
    return (
      <div className="w-full h-[38vh] min-h-[320px] bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-neutral-400">Loading SCORM module…</span>
        </div>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="w-full h-[38vh] min-h-[320px] bg-neutral-950 flex items-center justify-center">
        <p className="text-xs text-neutral-500 font-semibold">No SCORM package uploaded for this course.</p>
      </div>
    );
  }

  const heightClass = isCourseLevel ? "h-[65vh] min-h-[500px]" : "h-[38vh] min-h-[320px]";

  return (
    <div className="w-full bg-neutral-950 p-3">
      <iframe
        src={fileUrl}
        className={`w-full ${heightClass} border-0 rounded-xl bg-white`}
        title="SCORM Content"
        allowFullScreen
      />
    </div>
  );
}

export function WorkspaceClient({ 
  course, 
  quizzes, 
  activeLesson, 
  activeQuiz, 
  completedLessonIds = [],
  scormCourseProgress,
  capstoneProject,
  capstoneSubmission,
  subjectiveSubmissions = [],
  tenantName, 
  subdomain,
  primaryColor = "#0ea5e9",
  user,
  enableProctoring = false,
  enableAi = true,
  enableCapstone = true
}: WorkspaceClientProps) {
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"material" | "whiteboard" | "notes" | "chat" | "capstone" | "subjective">("material");

  // Lesson completions
  const [completedLessons, setCompletedLessons] = useState<string[]>(completedLessonIds);
  const [competencyLevel, setCompetencyLevel] = useState((user as any).competencyLevel || "Beginner");

  // Enforce sequential / competency locking
  const allLessons = course.modules.flatMap((mod) => mod.lessons);

  const getLessonLockStatus = (lesId: string) => {
    const lesson = allLessons.find((l) => l.id === lesId);
    if (!lesson) return { isLocked: false, reason: "" };

    const lessonDifficulty = (lesson as any).difficulty || "Beginner";

    // 1. Competency lock enforcement: lock Advanced lessons if student is Beginner
    if (course.unlockPolicy === "competency" || course.unlockPolicy === "sequential") {
      if (lessonDifficulty === "Advanced" && competencyLevel === "Beginner") {
        return { isLocked: true, reason: "competency" };
      }
    }

    // 2. Sequential lock enforcement: lock if preceding lessons are not completed
    if (course.unlockPolicy === "sequential") {
      const idx = allLessons.findIndex((l) => l.id === lesId);
      if (idx > 0) {
        const precedingLessons = allLessons.slice(0, idx);
        const hasUncompletedPreceding = precedingLessons.some((l) => !completedLessons.includes(l.id));
        if (hasUncompletedPreceding) {
          return { isLocked: true, reason: "sequential" };
        }
      }
    }

    return { isLocked: false, reason: "" };
  };

  const handleUpgradeCompetency = async () => {
    if (user.role === "Guest") {
      setCompetencyLevel("Advanced");
      setNotification({ type: "success", message: "Sandbox simulation: Competency upgraded to Advanced!" });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    try {
      const res = await updateStudentCompetencyAction("Advanced");
      if (res.success) {
        setCompetencyLevel("Advanced");
        setNotification({ type: "success", message: "Competency level upgraded to Advanced successfully!" });
      } else {
        setNotification({ type: "error", message: res.error || "Failed to upgrade competency." });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to upgrade competency." });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const [scormCompleted, setScormCompleted] = useState(!!scormCourseProgress?.completed);
  const [localScormData, setLocalScormData] = useState<any>(scormCourseProgress?.scormData || {});
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Scorecard modal simulation states
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [scorecardData, setScorecardData] = useState<{ studentName: string; avgScore: number } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__showScorecard = (studentName: string, avgScore: number) => {
        setScorecardData({ studentName, avgScore });
        setIsScorecardOpen(true);
      };
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__showScorecard;
      }
    };
  }, []);

  // Video progress tracking refs & handlers
  const lastSavedTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const handleVideoLoadedMetadata = async (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setVideoDuration(video.duration || 0);
    if (user.role !== "Student" || !activeLesson) return;
    try {
      const { getVideoProgressAction } = await import("../actions/course-actions");
      const res = await getVideoProgressAction(activeLesson.id);
      if (res.success && res.currentSeconds) {
        video.currentTime = res.currentSeconds;
        lastSavedTimeRef.current = res.currentSeconds;
        setVideoCurrentTime(res.currentSeconds);
      }
    } catch (err) {
      console.error("Failed to resume video progress:", err);
    }
  };

  const handleVideoTimeUpdate = async (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const curTime = video.currentTime;
    const dur = video.duration;
    setVideoCurrentTime(curTime);
    if (dur && !isNaN(dur)) {
      setVideoDuration(dur);
    }

    if (user.role !== "Student" || !activeLesson) return;
    if (!dur || isNaN(dur)) return;

    if (Math.abs(curTime - lastSavedTimeRef.current) >= 8 || curTime === dur) {
      lastSavedTimeRef.current = curTime;
      try {
        const { saveVideoProgressAction } = await import("../actions/course-actions");
        await saveVideoProgressAction(activeLesson.id, curTime, dur);
      } catch (err) {
        console.error("Failed to auto-save video progress:", err);
      }
    }
  };

  const playPauseVideo = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const skipVideo = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setVideoCurrentTime(newTime);
  };

  const toggleMuteVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleProgressBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setVideoCurrentTime(newTime);
  };

  const formatVideoTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    setIsPlaying(false);
    setIsMuted(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
  }, [activeLesson]);

  // Capstone submission local states
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [projectGitUrl, setProjectGitUrl] = useState("");
  const [projectDocUrl, setProjectDocUrl] = useState("");
  const [localSubmission, setLocalSubmission] = useState<any>(null);

  useEffect(() => {
    setLocalSubmission(capstoneSubmission);
    setProjectGitUrl(capstoneSubmission?.gitRepoUrl || "");
    setProjectDocUrl(capstoneSubmission?.documentationUrl || "");
    setIsResubmitting(false);
  }, [capstoneSubmission]);

  // Subjective submissions local states
  const [localSubmissionsList, setLocalSubmissionsList] = useState<any[]>(subjectiveSubmissions);
  const [subjectiveAnswer, setSubjectiveAnswer] = useState("");
  const [submittingSubjective, setSubmittingSubjective] = useState(false);

  useEffect(() => {
    setLocalSubmissionsList(subjectiveSubmissions);
  }, [subjectiveSubmissions]);

  // Sync current subjective answer for active lesson
  useEffect(() => {
    if (activeLesson) {
      const match = localSubmissionsList.find((s) => s.lessonId === activeLesson.id);
      setSubjectiveAnswer(match?.studentAnswer || "");
    } else {
      setSubjectiveAnswer("");
    }
  }, [activeLesson, localSubmissionsList]);

  useEffect(() => {
    setCompletedLessons(completedLessonIds);
  }, [completedLessonIds]);

  // Notes Auto-saving state
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Whiteboard Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState("#ffffff");
  const [penWidth, setPenWidth] = useState(3);
  
  // AI Chat state
  const [activeBot, setActiveBot] = useState<"tutor" | "book" | "score">("tutor");
  const [aiQuery, setAiQuery] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "user" | "ai"; text: string; rag?: any[] }>>([
    { sender: "ai", text: "Hello! I am your AI Semiconductor Assistant. Ask me anything about today's lesson, or use the shortcuts below to summarize or quiz yourself." }
  ]);
  const [expandedRagIndices, setExpandedRagIndices] = useState<Record<number, boolean>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Array<{ q: string; a: string; showAnswer?: boolean }>>([]);
  const [customQuiz, setCustomQuiz] = useState<Array<{ q: string; opts: string[]; answer: number; selected?: number }>>([]);
  
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const toggleSpeak = (text: string, index: number) => {
    if (typeof window === "undefined") return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    } else {
      window.speechSynthesis.cancel();
      
      const cleanText = text
        .replace(/\*\*|__|\*|_|`|#|🔗/g, "")
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
        
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      utterance.onend = () => {
        setSpeakingIndex(null);
      };
      utterance.onerror = () => {
        setSpeakingIndex(null);
      };

      setSpeakingIndex(index);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
    if (activeBot === "tutor") {
      setAiMessages([
        { sender: "ai", text: "Hello! I am your AI Semiconductor Assistant. Ask me anything about today's lesson, or use the shortcuts below to summarize or quiz yourself." }
      ]);
    } else if (activeBot === "book") {
      setAiMessages([
        { sender: "ai", text: "Hello! I am your AI Book Bot Librarian. I can search through our digital library textbooks, manuals, and worksheets. Try typing 'CMOS' or 'EUV' or 'transistor' to find reference links." }
      ]);
    } else if (activeBot === "score") {
      setAiMessages([
        { sender: "ai", text: "Hello! I am your AI Score Bot Coach. I can analyze your roadmap progress, average quiz score grades, and proctoring integrity record. Click 'Analyze Score' below to pull your progress audit report card!" }
      ]);
    }
    setFlashcards([]);
    setCustomQuiz([]);
  }, [activeBot]);

  // Chat & Polls state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; user: string; text: string; time: string; rx?: string }>>([
    { id: "1", user: "Linus Torvalds", text: "This lithography resolution formula makes so much sense now. Ray deflection is minimal.", time: "10:15 AM", rx: "🔥" },
    { id: "2", user: "Ada Lovelace", text: "Are we covering immersion lithography next week?", time: "10:18 AM", rx: "🧠" },
    { id: "3", user: "Gordon Moore", text: "Yes, immersion techniques are critical for getting below 10nm scaling limits.", time: "10:20 AM" }
  ]);
  const [newChatText, setNewChatText] = useState("");
  const [pollVotes, setPollVotes] = useState({ yes: 14, no: 3, review: 5 });
  const [votedOption, setVotedOption] = useState<string | null>(null);

  // Handle responsive sidebar behavior (auto-collapse under 1024px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
        setAiOpen(false);
      } else {
        setSidebarOpen(true);
        setAiOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load lesson notes from local storage on active lesson change
  useEffect(() => {
    if (activeLesson && typeof window !== "undefined") {
      const savedNotes = localStorage.getItem(`notes_${activeLesson.id}`);
      setNotes(savedNotes || "");
    }
    // Set default tab back to material
    setActiveTab("material");
    // Clear flashcard/custom quiz states on lesson change
    setFlashcards([]);
    setCustomQuiz([]);
    lastSavedTimeRef.current = 0;
  }, [activeLesson]);

  // Total time spent tracking
  useEffect(() => {
    if (user.role !== "Student" || !activeLesson) return;

    const interval = setInterval(async () => {
      try {
        const { incrementTimeSpentAction } = await import("../actions/course-actions");
        await incrementTimeSpentAction(activeLesson.id, 10);
      } catch (err) {
        console.error("Failed to increment time spent:", err);
      }
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [activeLesson, user.role]);

  // Notes Auto-save logic
  useEffect(() => {
    if (!activeLesson) return;
    setNotesSaving(true);
    const delayDebounce = setTimeout(() => {
      localStorage.setItem(`notes_${activeLesson.id}`, notes);
      setNotesSaving(false);
    }, 1000);
    return () => clearTimeout(delayDebounce);
  }, [notes, activeLesson]);

  const downloadWithWatermark = async (fileUrl: string, fileName: string) => {
    if (!fileUrl.toLowerCase().endsWith(".pdf")) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.target = "_blank";
      link.click();
      return;
    }

    setUpdatingProgress(true);
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const { PDFDocument, rgb, degrees } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      const watermarkText = `${tenantName.toUpperCase()} - ${user.firstName} ${user.lastName} (${user.userId})`;

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        page.drawText(watermarkText, {
          x: width / 2 - 180,
          y: height / 2 - 100,
          size: 14,
          color: rgb(0.7, 0.7, 0.7),
          opacity: 0.35,
          rotate: degrees(45),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const newBlob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const newUrl = URL.createObjectURL(newBlob);

      const link = document.createElement("a");
      link.href = newUrl;
      link.download = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      link.click();

      setTimeout(() => URL.revokeObjectURL(newUrl), 1000);
    } catch (error) {
      console.error("Failed to apply PDF watermark:", error);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.target = "_blank";
      link.click();
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleToggleComplete = async (lessonId: string) => {
    if (user.role === "Guest") {
      alert("State modifications are disabled in guest sandbox mode.");
      return;
    }
    const isCompleted = completedLessons.includes(lessonId);
    setUpdatingProgress(true);
    try {
      const res = await toggleLessonCompletionAction(lessonId, !isCompleted);
      if (res.success) {
        if (!isCompleted) {
          confetti({
            particleCount: 80,
            spread: 50,
            origin: { y: 0.8 }
          });
          setCompletedLessons(prev => [...prev, lessonId]);
          setNotification({
            type: "success",
            message: "Lesson completed! +50 XP awarded to your learning profile.",
          });
        } else {
          setCompletedLessons(prev => prev.filter(id => id !== lessonId));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingProgress(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capstoneProject) return;
    if (user.role === "Guest") {
      setNotification({
        type: "error",
        message: "State modifications are disabled in guest sandbox mode.",
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    setSubmittingProject(true);
    try {
      const res = await submitProjectAction(capstoneProject.id, projectGitUrl, projectDocUrl);
      if (res.success) {
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.8 }
        });
        setLocalSubmission({
          gitRepoUrl: projectGitUrl,
          documentationUrl: projectDocUrl,
          status: "pending",
          score: null,
          feedback: null
        } as any);
        setIsResubmitting(false);
        setNotification({
          type: "success",
          message: "Capstone project submitted successfully! Our faculty will review it soon.",
        });
      } else {
        setNotification({
          type: "error",
          message: res.error || "Submission failed. Please try again.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setSubmittingProject(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleSubjectiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson) return;
    if (user.role === "Guest") {
      setNotification({
        type: "error",
        message: "State modifications are disabled in guest sandbox mode.",
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    if (!subjectiveAnswer.trim()) {
      setNotification({
        type: "error",
        message: "Answer cannot be empty.",
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    setSubmittingSubjective(true);
    try {
      const promptText = `Please write a subjective summary or analysis based on this lesson: ${activeLesson.title}. Analyze the core concepts, their practical implementation in semiconductor/VLSI design, and explain the key trade-offs involved.`;
      const res = await submitSubjectiveAction({
        courseId: course.id,
        lessonId: activeLesson.id,
        title: `${activeLesson.title} - Subjective Assessment`,
        questionText: promptText,
        studentAnswer: subjectiveAnswer,
      });

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 40,
          origin: { y: 0.8 }
        });
        setNotification({
          type: "success",
          message: "Subjective response submitted successfully! Faculty will evaluate it manually.",
        });

        // Add to local list or modify local entry
        const existingIdx = localSubmissionsList.findIndex((s) => s.lessonId === activeLesson.id);
        const newSub = {
          lessonId: activeLesson.id,
          courseId: course.id,
          title: `${activeLesson.title} - Subjective Assessment`,
          questionText: promptText,
          studentAnswer: subjectiveAnswer,
          status: "pending",
          score: null,
          rubrics: null,
          feedback: null,
          history: [],
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingIdx > -1) {
          const updated = [...localSubmissionsList];
          updated[existingIdx] = { ...updated[existingIdx], ...newSub };
          setLocalSubmissionsList(updated);
        } else {
          setLocalSubmissionsList((prev) => [...prev, newSub]);
        }
      } else {
        setNotification({
          type: "error",
          message: res.error || "Submission failed. Please try again.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setSubmittingSubjective(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Whiteboard drawing functions with dynamic container size synchronization
  useEffect(() => {
    if (activeTab !== "whiteboard" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (canvas.width !== rect.width || canvas.height !== rect.height)) {
        // Backup current canvas pixels
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
        }
        
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = penColor;
          ctx.lineWidth = penWidth;
          // Restore drawing content scaled to new dimensions
          ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
        }
      } else {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = penColor;
          ctx.lineWidth = penWidth;
        }
      }
    };

    resizeCanvas();
    
    const parent = canvas.parentElement;
    if (parent) {
      const observer = new ResizeObserver(() => {
        resizeCanvas();
      });
      observer.observe(parent);
      return () => observer.disconnect();
    }
  }, [activeTab, penColor, penWidth]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `whiteboard-drawing-${activeLesson?.title || "notes"}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // AI Assistant trigger actions
  const askAI = async (customPrompt?: string) => {
    if (!activeLesson) return;
    const queryText = customPrompt || aiQuery;
    if (!queryText.trim()) return;

    setAiMessages(prev => [...prev, { sender: "user", text: queryText }]);
    if (!customPrompt) {
      setAiQuery("");
    }
    setAiLoading(true);

    try {
      const res = await askAiAction(activeLesson.id, queryText, activeBot);
      if (res.success && res.data) {
        const payload = res.data;
        
        // Generate simulated RAG chunks for this prompt
        const textLower = queryText.toLowerCase();
        let ragChunks = [
          { source: "Course Syllabus & Lab Manual.pdf", page: 2, snippet: "The student learning dashboard allows tracking of daily course roadmap objectives and quizzes.", score: 0.81 },
          { source: "Core Course Notes.pdf", page: 15, snippet: "All assignments require git repository references for faculty evaluation.", score: 0.76 }
        ];
        if (textLower.includes("cmos") || textLower.includes("fabrication") || textLower.includes("vlsi") || textLower.includes("lithography") || textLower.includes("summarize") || textLower.includes("quiz")) {
          ragChunks = [
            { source: "CMOS VLSI Design (4th Ed) - Chapter 3.pdf", page: 89, snippet: "The scaling of CMOS transistors requires precise control over gate-to-source capacitance and threshold voltage parameters.", score: 0.94 },
            { source: "Lithography Guidelines Handbook.pdf", page: 12, snippet: "Immersion lithography scaling limits are dictated by the refractive index of fluid layer.", score: 0.88 }
          ];
        }

        setAiMessages(prev => [...prev, { sender: "ai", text: payload.text, rag: ragChunks }]);
        
        if (payload.flashcards) {
          setFlashcards(payload.flashcards);
        } else if (customPrompt === "Generate Flashcards") {
          setFlashcards([]);
        }

        if (payload.quiz) {
          setCustomQuiz(payload.quiz);
        } else if (customPrompt === "Quiz me") {
          setCustomQuiz([]);
        }
      } else {
        setAiMessages(prev => [
          ...prev, 
          { sender: "ai", text: `Error: ${res.error || "Failed to communicate with AI Tutor Assistant."}` }
        ]);
      }
    } catch (err: any) {
      setAiMessages(prev => [
        ...prev, 
        { sender: "ai", text: `System Error: ${err.message || "An unexpected error occurred."}` }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleVote = (option: string) => {
    if (votedOption) return;
    setVotedOption(option);
    setPollVotes(prev => ({
      ...prev,
      [option]: (prev as any)[option] + 1
    }));
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        user: `${user.firstName} ${user.lastName}`,
        text: newChatText.trim(),
        time: "Just Now"
      }
    ]);
    setNewChatText("");
  };

  // Brand details resolver
  const getBrandDetails = () => {
    const sub = subdomain.toLowerCase();
    if (sub === "vt" || sub === "vti") {
      return {
        logoText: "VT",
        logoSubtext: "VIRGINIA TECH",
        logoColor: "#861F41", // Maroon
        accentColor: "#E57724", // Orange
        domain: "iamneo.vt.edu",
        pathway: "Sustainability & ESG Career Pathway"
      };
    } else if (sub === "intel") {
      return {
        logoText: "Intel",
        logoSubtext: "INTEL COE",
        logoColor: "#0068B5",
        accentColor: "#00c6ff",
        domain: "iamneo.intel.com",
        pathway: "Advanced Semiconductor & VLSI Design Pathway"
      };
    } else if (sub === "amd") {
      return {
        logoText: "AMD",
        logoSubtext: "AMD COE",
        logoColor: "#ED1C24",
        accentColor: "#ff4d4d",
        domain: "iamneo.amd.com",
        pathway: "High Performance Computing & GPU Design Pathway"
      };
    } else {
      return {
        logoText: tenantName.substring(0, 3).toUpperCase(),
        logoSubtext: tenantName.toUpperCase(),
        logoColor: primaryColor,
        accentColor: primaryColor,
        domain: `iamneo.${subdomain}.edu`,
        pathway: "Microelectronics & Systems Engineering Pathway"
      };
    }
  };

  // High-fidelity print generator
  const handlePrintScorecard = () => {
    if (!scorecardData) return;
    const printContent = document.getElementById("career-scorecard-print-area");
    if (!printContent) return;

    const brand = getBrandDetails();

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>${brand.logoSubtext} Career Scorecard - ${scorecardData.studentName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 0.5cm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background-color: white !important;
                color: black !important;
              }
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background-color: white;
              padding: 10px;
            }
          </style>
        </head>
        <body class="bg-white">
          <div class="w-[1150px] mx-auto bg-white p-6 rounded-3xl border border-slate-100">
            ${printContent.innerHTML}
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 800);
            });
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const brand = getBrandDetails();

  // Dynamic calculations for 10 indices
  const baseScore = scorecardData?.avgScore || 82;
  const indexScores = [
    baseScore,
    Math.min(100, baseScore + 8),
    Math.max(40, baseScore - 4),
    Math.min(100, baseScore + 4),
    Math.max(40, baseScore - 2),
    Math.max(40, baseScore - 6),
    Math.min(100, baseScore + 10),
    Math.max(40, baseScore - 1),
    Math.min(100, baseScore + 2),
    Math.min(100, baseScore + 9),
  ];
  const overallAverageScore = Math.round(indexScores.reduce((a, b) => a + b, 0) / 10);
  const totalScorePoints = overallAverageScore * 10;
  
  let gradeLetter = "A";
  if (overallAverageScore >= 90) gradeLetter = "A+";
  else if (overallAverageScore >= 80) gradeLetter = "A";
  else if (overallAverageScore >= 70) gradeLetter = "B";
  else if (overallAverageScore >= 60) gradeLetter = "C";
  else gradeLetter = "D";

  const getRatingText = (s: number) => {
    if (s >= 90) return "Outstanding";
    if (s >= 80) return "Excellent";
    if (s >= 70) return "Strong";
    if (s >= 60) return "Good";
    return "Needs Imp.";
  };

  // Get active items to highlight sidebar
  const activeLessonId = activeLesson?.id || "";
  const activeQuizId = activeQuiz?.id || "";

  return (
    <div className="flex h-[calc(100vh-4rem)] border border-border rounded-2xl bg-background overflow-hidden relative">
      
      {/* Curriculum Sidebar */}
      <aside 
        className={`bg-card border-r border-border flex flex-col transition-all duration-300 shrink-0 ${
          sidebarOpen ? "w-72" : "w-0"
        } overflow-hidden`}
      >
        {course.scormEnabled ? (
          <>
            <div className="p-4 border-b border-border/80 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-primary" /> SCORM Package
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slate-900/40 border border-border/50 p-4 rounded-xl space-y-3.5">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Course Delivery
                  </h4>
                  <p className="text-xs font-extrabold text-foreground">{course.name}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground block font-bold uppercase">Completion Status</span>
                  {scormCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 uppercase tracking-widest">
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded text-sky-400 uppercase tracking-widest">
                      In Progress
                    </span>
                  )}
                </div>

                {(localScormData["cmi.core.score.raw"] || localScormData["cmi.score.raw"]) ? (
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground block font-bold uppercase">Assessment Score</span>
                    <strong className="text-sm font-black text-foreground">
                      {localScormData["cmi.core.score.raw"] || localScormData["cmi.score.raw"]}%
                    </strong>
                  </div>
                ) : null}

                {localScormData["_total_time_seconds"] ? (
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground block font-bold uppercase">Total Time Spent</span>
                    <strong className="text-xs font-extrabold text-foreground">
                      {Math.round(parseInt(localScormData["_total_time_seconds"], 10) / 60)} mins
                    </strong>
                  </div>
                ) : null}

                {(localScormData["cmi.core.lesson_location"] || localScormData["cmi.location"]) ? (
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground block font-bold uppercase">Last Bookmark</span>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {localScormData["cmi.core.lesson_location"] || localScormData["cmi.location"]}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-border/80 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-primary" /> Syllabus Roadmap
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-5">
              {course.modules.map((mod) => (
                <div key={mod.id} className="space-y-2">
                  <h4 className="px-2 text-[10px] font-black text-muted-foreground uppercase tracking-wide leading-tight truncate" title={mod.name}>
                    {mod.name}
                  </h4>
                  <div className="space-y-1">
                    {mod.lessons.map((les) => {
                      const isActive = activeLessonId === les.id;
                      const lessonQuiz = quizzes.find((q) => q.lessonId === les.id);
                      const lockStatus = getLessonLockStatus(les.id);
                      return (
                        <div key={les.id} className="space-y-0.5">
                          <a
                            href={lockStatus.isLocked ? undefined : `/courses/${course.id}?lessonId=${les.id}`}
                            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                              lockStatus.isLocked
                                ? "opacity-50 cursor-not-allowed text-muted-foreground/60"
                                : isActive 
                                ? "bg-primary/10 text-primary border-l-2" 
                                : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                            }`}
                            style={isActive && !lockStatus.isLocked ? { borderLeftColor: primaryColor, color: primaryColor } : undefined}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="shrink-0 text-sm">
                                {lockStatus.isLocked ? (
                                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : les.contentType === "video" ? (
                                  "📺"
                                ) : les.contentType === "live_class" ? (
                                  "🎥"
                                ) : (
                                  "📄"
                                )}
                              </span>
                              <span className="truncate flex-1">{les.title}</span>
                            </div>
                            {completedLessons.includes(les.id) && !lockStatus.isLocked && (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                          </a>

                          {lessonQuiz && (
                            <a
                              href={lockStatus.isLocked ? undefined : `/courses/${course.id}?quizId=${lessonQuiz.id}`}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 pl-8 rounded-xl text-[10px] font-extrabold transition-all ${
                                lockStatus.isLocked
                                  ? "opacity-50 cursor-not-allowed text-muted-foreground/45"
                                  : activeQuizId === lessonQuiz.id
                                  ? "bg-amber-500/10 text-amber-500 border-l-2 border-amber-500" 
                                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                              }`}
                            >
                              <span>✍️</span>
                              <span className="truncate flex-1">{lessonQuiz.title}</span>
                              {lockStatus.isLocked && <Lock className="w-2.5 h-2.5 text-muted-foreground ml-auto" />}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Collapse Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-1/2 -translate-y-1/2 left-0 z-20 w-5 h-10 bg-card border-r border-y border-border hover:bg-secondary flex items-center justify-center text-muted-foreground rounded-r-lg"
      >
        {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Main Study Zone */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {course.scormEnabled ? (
          <div className="flex-1 overflow-y-auto p-4 bg-card/10">
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{course.name}</h3>
                  <p className="text-[10px] text-muted-foreground">SCORM Course Delivery Mode</p>
                </div>
                {scormCompleted && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-emerald-400 uppercase tracking-wider">
                    🎉 Completed
                  </span>
                )}
              </div>
              <div className="border border-border rounded-2xl overflow-hidden shadow-2xl bg-black">
                <ScormInlinePlayer
                  courseId={course.id}
                  isCourseLevel={true}
                  fileUrl={course.scormPackageUrl || null}
                  userName={`${user.firstName} ${user.lastName}`}
                  userId={user.userId}
                  onScormDataUpdate={(data) => {
                    setLocalScormData(data);
                    const status = (data["cmi.core.lesson_status"] || data["cmi.completion_status"] || "").toLowerCase();
                    const success = (data["cmi.success_status"] || "").toLowerCase();
                    if (["completed", "passed"].includes(status) || success === "passed") {
                      setScormCompleted(true);
                    }
                  }}
                  onComplete={() => {
                    setScormCompleted(true);
                    confetti({
                      particleCount: 100,
                      spread: 70,
                      origin: { y: 0.6 }
                    });
                  }}
                />
              </div>
            </div>
          </div>
        ) : activeQuiz ? (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 bg-card/10">
            <QuizWorkspace 
              quiz={activeQuiz} 
              tenantName={tenantName}
              primaryColor={primaryColor}
              enableProctoring={enableProctoring}
            />
          </div>
        ) : activeLesson ? (
          (() => {
            const lockStatus = getLessonLockStatus(activeLesson.id);
            if (lockStatus.isLocked) {
              return (
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 bg-card/10">
                  <div className="w-full max-w-md sexy-border-glow bg-card/45 backdrop-blur-md rounded-3xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        Lesson Unit Locked
                      </span>
                      <h3 className="text-base font-extrabold text-foreground">{activeLesson.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lockStatus.reason === "competency" 
                          ? "This advanced microelectronics lesson requires 'Advanced' student competency level rank."
                          : "This lesson is locked. You must sequentially complete all preceding curriculum modules first."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/40 flex flex-col gap-3">
                      {lockStatus.reason === "competency" ? (
                        <button
                          type="button"
                          onClick={handleUpgradeCompetency}
                          className="w-full py-2 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Upgrade Rank to Advanced
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (user.role === "Guest") {
                              const preceding = allLessons.slice(0, allLessons.findIndex((l) => l.id === activeLesson.id));
                              const ids = preceding.map((l) => l.id);
                              setCompletedLessons((prev) => [...new Set([...prev, ...ids])]);
                              setNotification({ type: "success", message: "Sandbox simulation: Completed preceding lessons!" });
                              setTimeout(() => setNotification(null), 4000);
                              return;
                            }
                            const preceding = allLessons.slice(0, allLessons.findIndex((l) => l.id === activeLesson.id));
                            const uncompleted = preceding.filter((l) => !completedLessons.includes(l.id));
                            setUpdatingProgress(true);
                            try {
                              for (const l of uncompleted) {
                                await toggleLessonCompletionAction(l.id, true);
                              }
                              setCompletedLessons((prev) => [...new Set([...prev, ...uncompleted.map((l) => l.id)])]);
                              setNotification({ type: "success", message: "Preceding lessons marked as completed!" });
                            } catch (err: any) {
                              setNotification({ type: "error", message: err.message || "Failed to complete lessons." });
                            } finally {
                              setUpdatingProgress(false);
                              setTimeout(() => setNotification(null), 4000);
                            }
                          }}
                          disabled={updatingProgress}
                          className="w-full py-2 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {updatingProgress ? "Completing Prerequisites..." : "Complete Preceding Prerequisites"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Viewport: Video, PDF text, or Zoom */}
                <div className="bg-card/35 border-b border-border shrink-0">
                  {activeLesson.contentType === "video" && activeLesson.videoUrl && (
                    <div className="aspect-video max-h-[38vh] mx-auto bg-black relative flex items-center justify-center group overflow-hidden rounded-xl border border-border/40 shadow-2xl">
                      <video 
                        ref={videoRef}
                        key={activeLesson.videoUrl}
                        className="w-full h-full object-contain"
                        poster="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1200"
                        onLoadedMetadata={handleVideoLoadedMetadata}
                        onTimeUpdate={handleVideoTimeUpdate}
                        onClick={playPauseVideo}
                        playsInline
                      >
                        {activeLesson.videoUrl && <source src={activeLesson.videoUrl} type="video/mp4" />}
                        <source src="/sample-video.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>

                      {/* Top Header Overlay: Displays the Lesson Title */}
                      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-start z-10">
                        <span className="text-[9px] font-black text-primary tracking-widest uppercase" style={{ color: primaryColor }}>
                          Now Playing
                        </span>
                        <h4 className="text-white text-xs font-black drop-shadow truncate">
                          {activeLesson.title}
                        </h4>
                      </div>

                      {/* Center Play/Pause Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <button 
                          onClick={playPauseVideo}
                          className="w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto hover:scale-105 hover:bg-black/85 cursor-pointer shadow-lg border border-white/10"
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5 fill-white text-white" />
                          ) : (
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Custom Controls Bar Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2 pointer-events-auto z-10">
                        {/* Progress Slider */}
                        <div className="flex items-center gap-2">
                          <input 
                            type="range"
                            min={0}
                            max={videoDuration || 100}
                            value={videoCurrentTime}
                            onChange={handleProgressBarChange}
                            className="flex-1 accent-primary h-1 bg-white/20 rounded-lg appearance-none cursor-pointer hover:h-1.5 transition-all"
                            style={{ '--c': primaryColor } as any}
                          />
                        </div>

                        {/* Bottom Control buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            {/* Play/Pause */}
                            <button 
                              onClick={playPauseVideo}
                              className="text-white hover:text-primary transition-colors cursor-pointer"
                              style={isPlaying ? { color: primaryColor } : undefined}
                              title={isPlaying ? "Pause" : "Play"}
                            >
                              {isPlaying ? <Pause className="w-4 h-4 fill-current text-white" /> : <Play className="w-4 h-4 fill-current text-white" />}
                            </button>

                            {/* Back 10s */}
                            <button 
                              onClick={() => skipVideo(-10)}
                              className="text-white hover:text-primary transition-colors cursor-pointer"
                              title="Rewind 10s"
                            >
                              <RotateCcw className="w-4 h-4 text-white" />
                            </button>

                            {/* Forward 10s */}
                            <button 
                              onClick={() => skipVideo(10)}
                              className="text-white hover:text-primary transition-colors cursor-pointer"
                              title="Forward 10s"
                            >
                              <RotateCw className="w-4 h-4 text-white" />
                            </button>

                            {/* Time display */}
                            <span className="text-[10px] text-white/90 font-mono select-none">
                              {formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3.5">
                            {/* Mute/Unmute */}
                            <button 
                              onClick={toggleMuteVideo}
                              className="text-white hover:text-primary transition-colors cursor-pointer"
                              title={isMuted ? "Unmute" : "Mute"}
                            >
                              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500 fill-current" /> : <Volume2 className="w-4 h-4 text-white" />}
                            </button>

                            {/* Fullscreen */}
                            <button 
                              onClick={() => {
                                if (videoRef.current) {
                                  if (document.fullscreenElement) {
                                    document.exitFullscreen().catch(console.error);
                                  } else {
                                    videoRef.current.requestFullscreen().catch(console.error);
                                  }
                                }
                              }}
                              className="text-white hover:text-primary transition-colors cursor-pointer"
                              title="Fullscreen"
                            >
                              <Maximize className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeLesson.contentType === "live_class" && (
                    <div className="py-8 text-center bg-gradient-to-tr from-card to-background space-y-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 text-2xl flex items-center justify-center mx-auto animate-pulse">
                        🎥
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 uppercase tracking-widest">
                          Live Classroom
                        </span>
                        <h3 className="text-sm font-extrabold text-foreground">{activeLesson.title}</h3>
                        <p className="text-[10px] text-muted-foreground">Meeting details generated securely below.</p>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-left max-w-xs bg-background border border-border p-2.5 rounded-xl mx-auto text-[10px] font-mono">
                        <div>
                          <span className="text-muted-foreground block">ID:</span>
                          <strong className="text-foreground">{activeLesson.zoomMeetingId || "821 7401"}</strong>
                        </div>
                        <div className="border-l border-border pl-4">
                          <span className="text-muted-foreground block">Key:</span>
                          <strong className="text-foreground">{activeLesson.zoomPasscode || "intelLMS"}</strong>
                        </div>
                      </div>
                      <a 
                        href="https://zoom.us" 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={async () => {
                          try {
                            const { logZoomAttendanceAction } = await import("../actions/course-actions");
                            await logZoomAttendanceAction(activeLesson.id);
                          } catch (err) {
                            console.error("Failed to log Zoom attendance:", err);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        Enter Live Class
                      </a>
                    </div>
                  )}

                  {activeLesson.contentType === "text" && (
                    <div className="p-6 bg-gradient-to-r from-primary/5 to-transparent flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-lg">
                        📄
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">Document Workspace</span>
                        <h3 className="text-sm font-extrabold text-foreground">{activeLesson.title}</h3>
                      </div>
                    </div>
                  )}


                  {activeLesson.contentType === "audio" && activeLesson.videoUrl && (
                    <div className="py-6 px-8 text-center bg-gradient-to-tr from-card to-background space-y-4 border-b border-border">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary text-xl flex items-center justify-center mx-auto">
                        🎧
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-primary uppercase tracking-widest">
                          Audio Lecture Podcast
                        </span>
                        <h3 className="text-sm font-extrabold text-foreground">{activeLesson.title}</h3>
                      </div>
                      <div className="max-w-md mx-auto">
                        <audio 
                          key={activeLesson.videoUrl}
                          controls 
                          className="w-full"
                        >
                          {activeLesson.videoUrl && <source src={activeLesson.videoUrl} type="audio/mpeg" />}
                          <source src="/sample-audio.mp3" type="audio/mpeg" />
                        </audio>
                      </div>
                      {/* Waveform graphic visualization */}
                      <div className="flex justify-center items-end gap-1 h-8 max-w-[200px] mx-auto select-none">
                        <span className="w-1 bg-primary/40 rounded-full h-4 animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <span className="w-1 bg-primary/60 rounded-full h-7 animate-bounce" style={{ animationDelay: '0.3s' }} />
                        <span className="w-1 bg-primary rounded-full h-5 animate-bounce" style={{ animationDelay: '0.5s' }} />
                        <span className="w-1 bg-primary/70 rounded-full h-8 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <span className="w-1 bg-primary/50 rounded-full h-4 animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  )}

                  {(activeLesson.contentType === "excel" || activeLesson.contentType === "sheets") && (
                    <div className="p-4 bg-card/60 border-b border-border flex flex-col items-stretch space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">
                            Interactive Spreadsheet Workspace
                          </span>
                          <h3 className="text-xs font-black text-foreground mt-1">{activeLesson.title}</h3>
                        </div>
                        {activeLesson.fileUrl && (
                          <a 
                            href={activeLesson.fileUrl} 
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] font-black uppercase text-primary tracking-wider hover:underline flex items-center gap-1"
                            style={{ color: primaryColor }}
                          >
                            📂 Open Excel Sheet
                          </a>
                        )}
                      </div>
                      
                      {/* Spreadsheet Grid Component */}
                      <div className="border border-border rounded-xl overflow-hidden bg-background">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-muted/30 text-muted-foreground border-b border-border font-bold">
                              <th className="p-2 border-r border-border text-center w-8 bg-muted/10"></th>
                              <th className="p-2 border-r border-border w-24">Parameter</th>
                              <th className="p-2 border-r border-border w-16">Target</th>
                              <th className="p-2 border-r border-border w-16">Value</th>
                              <th className="p-2 border-r border-border w-16">Tolerance</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { id: 1, param: "Fin Width (W_fin)", target: "8nm", val: "7.92nm", tol: "±0.1nm", status: "PASS" },
                              { id: 2, param: "Gate Length (L_g)", target: "14nm", val: "14.05nm", tol: "±0.2nm", status: "PASS" },
                              { id: 3, param: "EOT (Oxide Thickness)", target: "0.9nm", val: "0.89nm", tol: "±0.05nm", status: "PASS" },
                              { id: 4, param: "Threshold Voltage (V_th)", target: "0.28V", val: "0.274V", tol: "±0.02V", status: "PASS" },
                            ].map((row) => (
                              <tr key={row.id} className="border-b border-border hover:bg-muted/10">
                                <td className="p-2 border-r border-border text-center font-bold text-muted-foreground bg-muted/10">{row.id}</td>
                                <td className="p-2 border-r border-border font-extrabold text-foreground">{row.param}</td>
                                <td className="p-2 border-r border-border text-muted-foreground font-semibold">{row.target}</td>
                                <td className="p-2 border-r border-border font-mono">
                                  <input 
                                    type="text"
                                    defaultValue={row.val}
                                    className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 border-none text-foreground font-mono"
                                  />
                                </td>
                                <td className="p-2 border-r border-border text-muted-foreground">{row.tol}</td>
                                <td className="p-2 font-black text-emerald-400">{row.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeLesson.contentType === "scorm" && (
                    <ScormInlinePlayer
                      lessonId={activeLesson.id}
                      fileUrl={activeLesson.fileUrl || null}
                      userName={user ? `${user.firstName} ${user.lastName}` : "Student"}
                      userId={user?.userId || ""}
                      onComplete={() => {
                        confetti({ particleCount: 80, spread: 60 });
                        if (!completedLessons.includes(activeLesson.id)) {
                          setCompletedLessons(prev => [...prev, activeLesson.id]);
                        }
                      }}
                    />
                  )}
                </div>

                {/* Split Tab Panel below Viewport */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Tab Navigation header */}
                  <div className="h-11 border-b border-border bg-card/25 flex items-center justify-between px-6 shrink-0">
                    <div className="flex-1 overflow-x-auto scrollbar-none flex items-center mr-4">
                      <div className="flex gap-2 min-w-max">
                      {((): any[] => {
                        const list = [
                          { id: "material", label: "Study Materials", icon: FileText },
                          { id: "whiteboard", label: "Drawing Board", icon: BrainCircuit },
                          { id: "notes", label: "Notebook", icon: Edit3 },
                          { id: "chat", label: "Discussion Hub", icon: MessageSquare }
                        ];
                        if (activeLesson) {
                          list.push({ id: "subjective", label: "Subjective Submission", icon: Edit3 });
                        }
                        if (capstoneProject && enableCapstone) {
                          list.push({ id: "capstone", label: "Capstone Project", icon: Award });
                        }
                        return list;
                      })().map((tab) => {
                        const Icon = tab.icon;
                        const isSel = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide transition-all cursor-pointer ${
                              isSel 
                                ? "bg-primary/10 text-primary" 
                                : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                            }`}
                            style={isSel ? { color: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                    
                    {activeTab === "notes" && notesSaving && (
                      <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    )}
                  </div>
                             {/* Tab content display */}
                  <div className="flex-1 overflow-y-auto p-6 bg-card/10">
                    {notification && (
                      <div className={`mb-6 p-4 rounded-xl text-xs font-semibold flex items-center justify-between border animate-in slide-in-from-top duration-300 ${
                        notification.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
                          : "bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400"
                      }`}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          <span>{notification.message}</span>
                        </div>
                        <button onClick={() => setNotification(null)} className="text-muted-foreground hover:text-foreground p-1 text-sm font-bold">✕</button>
                      </div>
                    )}

                    {activeTab === "material" && (
                      <div className="space-y-5 max-w-3xl">
                        <div className="space-y-2">
                          <h3 className="text-base font-extrabold text-foreground">{activeLesson.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {activeLesson.content || "Read the conceptual transcript notes. Use the Notebook tab to capture equations or notes."}
                          </p>
                        </div>

                        {activeLesson.fileUrl && (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/5 border border-primary/20 p-4 rounded-xl">
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-primary tracking-wider">Lesson Attachment</span>
                              <h4 className="text-xs font-bold text-foreground">Practical Handout / Worksheet PDF</h4>
                              <p className="text-[10px] text-muted-foreground">Download the exercises and practice problems for this module.</p>
                            </div>
                            <a 
                              href={`/api/download?lessonId=${activeLesson.id}`}
                              download
                              className="flex items-center gap-1.5 bg-primary hover:opacity-95 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer self-stretch sm:self-auto justify-center"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <Download className="w-3.5 h-3.5" /> Download Worksheet
                            </a>
                          </div>
                        )}

                        <div className="border-t border-border/60 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-foreground">Lesson Completion</h4>
                            <p className="text-[10px] text-muted-foreground">Mark this lesson as completed to update your learning streak and earn +50 XP.</p>
                          </div>
                          <button
                            onClick={() => handleToggleComplete(activeLesson.id)}
                            disabled={updatingProgress || user.role === "Guest"}
                            className={`h-10 px-5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                              completedLessons.includes(activeLesson.id)
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                                : "text-white hover:opacity-95"
                            } disabled:opacity-50`}
                            style={!completedLessons.includes(activeLesson.id) ? { backgroundColor: primaryColor } : undefined}
                          >
                            {user.role === "Guest" ? "Read Only" : completedLessons.includes(activeLesson.id) ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-emerald-500" /> Lesson Completed
                              </>
                            ) : (
                              "Mark as Complete (+50 XP)"
                            )}
                          </button>
                        </div>

                        <div className="bg-secondary/10 border border-border p-4 rounded-xl space-y-2 text-xs text-muted-foreground leading-relaxed font-sans">
                          <strong className="text-foreground block text-[10px] uppercase font-black tracking-wider">Fabrication Guidelines</strong>
                          <p>
                            Advanced node layouts are strictly limited by physical design rule checks (DRC). Photoresist exposures require clean wavelengths and fine diffraction tuning. Channel lengths below 14nm require FinFET or GAA structures to maintain proper electrostatic gate control.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === "whiteboard" && (
                      <div className="h-full flex flex-col space-y-3">
                        <div className="flex items-center justify-between shrink-0 bg-card border border-border p-2.5 rounded-xl text-xs gap-4">
                          {/* Tools & Colors */}
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setPenColor("#ffffff")}
                              className={`w-5 h-5 rounded-full bg-white border border-border ${penColor === "#ffffff" ? "ring-2 ring-primary" : ""}`}
                            />
                            <button 
                              onClick={() => setPenColor("#f43f5e")}
                              className={`w-5 h-5 rounded-full bg-rose-500 border border-border ${penColor === "#f43f5e" ? "ring-2 ring-primary" : ""}`}
                            />
                            <button 
                              onClick={() => setPenColor("#10b981")}
                              className={`w-5 h-5 rounded-full bg-emerald-500 border border-border ${penColor === "#10b981" ? "ring-2 ring-primary" : ""}`}
                            />
                            <button 
                              onClick={() => setPenColor(primaryColor)}
                              className={`w-5 h-5 rounded-full border border-border ${penColor === primaryColor ? "ring-2 ring-primary" : ""}`}
                              style={{ backgroundColor: primaryColor }}
                            />
                          </div>

                          <div className="flex items-center gap-2 border-l border-border pl-3">
                            <span className="text-[10px] text-muted-foreground">Brush Size:</span>
                            <input
                              type="range" min={1} max={10} value={penWidth}
                              onChange={(e) => setPenWidth(parseInt(e.target.value))}
                              className="w-16 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button 
                              onClick={clearCanvas}
                              className="px-2.5 py-1 text-[10px] font-black border border-border rounded-lg hover:bg-secondary transition-colors"
                            >
                              Clear
                            </button>
                            <button 
                              onClick={downloadCanvas}
                              className="px-2.5 py-1 text-[10px] font-black bg-primary text-white rounded-lg hover:opacity-95 flex items-center gap-1 transition-all cursor-pointer"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <Download className="w-3 h-3" /> Save Drawing
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 bg-[#1e293b] rounded-xl border border-border overflow-hidden relative min-h-[250px]">
                          <canvas
                            ref={canvasRef}
                            width={600}
                            height={400}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="absolute inset-0 w-full h-full cursor-crosshair"
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === "notes" && (
                      <div className="h-full flex flex-col space-y-2">
                        <textarea
                          placeholder="Write rich notes, formulas, or reminders for this lesson here. They will auto-save instantly to your client storage."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full flex-1 bg-secondary/20 border border-border rounded-xl p-4 text-xs font-mono leading-relaxed placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[200px]"
                        />
                      </div>
                    )}

                    {activeTab === "chat" && (
                      <div className="h-full flex flex-col space-y-4">
                        {/* Poll panel */}
                        <div className="bg-secondary/15 border border-border p-4 rounded-xl space-y-2.5 shrink-0">
                          <span className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                            <QuestionIcon className="w-3.5 h-3.5" /> Class Checkpoint Poll
                          </span>
                          <p className="text-xs font-bold text-foreground">Do you understand the difference between static and dynamic logic families?</p>
                          
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: "yes", text: "Yes, clear", count: pollVotes.yes },
                              { id: "no", text: "Confused", count: pollVotes.no },
                              { id: "review", text: "Need review", count: pollVotes.review }
                            ].map((opt) => {
                              const totalVotes = pollVotes.yes + pollVotes.no + pollVotes.review;
                              const percent = Math.round((opt.count / totalVotes) * 100);
                              const isVoted = votedOption === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleVote(opt.id)}
                                  className={`p-2.5 rounded-xl border text-left text-[10px] transition-all relative overflow-hidden ${
                                    isVoted 
                                      ? "border-primary bg-primary/5 text-primary" 
                                      : votedOption 
                                        ? "border-border bg-secondary/5 text-muted-foreground" 
                                        : "border-border hover:border-slate-500 cursor-pointer"
                                  }`}
                                  disabled={votedOption !== null}
                                >
                                  <div className="absolute inset-y-0 left-0 bg-primary/5 transition-all" style={{ width: votedOption ? `${percent}%` : "0%" }} />
                                  <div className="relative flex justify-between font-bold">
                                    <span>{opt.text}</span>
                                    <span>{votedOption ? `${percent}%` : ""}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Messages stream */}
                        <div className="flex-1 overflow-y-auto space-y-3 p-1 min-h-[150px]">
                          {chatMessages.map((msg) => (
                            <div key={msg.id} className="p-3 bg-secondary/10 border border-border/40 rounded-xl space-y-1.5 max-w-xl">
                              <div className="flex items-center justify-between text-[9px] font-semibold text-muted-foreground">
                                <span className="font-extrabold text-foreground">{msg.user}</span>
                                <span>{msg.time}</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{msg.text}</p>
                              {msg.rx && (
                                <span className="inline-block bg-secondary/40 border border-border px-1.5 py-0.5 rounded text-[10px]">
                                  {msg.rx} 1
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Chat input form */}
                        <form onSubmit={handleSendChat} className="flex gap-2 shrink-0">
                          <input
                            type="text"
                            placeholder="Write a message to the group chat..."
                            value={newChatText}
                            onChange={(e) => setNewChatText(e.target.value)}
                            className="flex-1 bg-secondary/20 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="bg-primary text-white px-4 py-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    )}

                    {activeTab === "capstone" && (
                      <div className="space-y-6 max-w-3xl">
                        {!capstoneProject ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-lg">
                              🏆
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-foreground">No Capstone Project Assigned</h4>
                              <p className="text-[10px] text-muted-foreground">This course does not require a capstone project submission.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Project Header details */}
                            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-border p-6 rounded-2xl space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Course Capstone</span>
                                <div className="flex gap-2">
                                  <span className="text-[9px] font-black bg-secondary border px-2 py-0.5 rounded text-muted-foreground">{capstoneProject.difficulty}</span>
                                  <span className="text-[9px] font-black bg-secondary border px-2 py-0.5 rounded text-muted-foreground">{capstoneProject.durationWeeks} Weeks Duration</span>
                                </div>
                              </div>
                              <h3 className="text-sm font-extrabold text-foreground">{capstoneProject.title}</h3>
                              <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line font-sans border-t border-border/60 pt-4">
                                {capstoneProject.description}
                              </div>
                            </div>

                            {/* Submission status or form */}
                            {localSubmission && !isResubmitting ? (
                              <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-200">
                                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                                  <h4 className="text-xs font-extrabold text-foreground">Your Submission</h4>
                                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                                    localSubmission.status === "approved" 
                                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500" 
                                      : localSubmission.status === "failed"
                                        ? "bg-red-500/15 border-red-500/30 text-red-500"
                                        : "bg-amber-500/15 border-amber-500/30 text-amber-500"
                                  }`}>
                                    {localSubmission.status === "approved" ? "Approved" : localSubmission.status === "failed" ? "Changes Requested" : "Pending Review"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-muted-foreground block">Git Repository:</span>
                                    <a href={localSubmission.gitRepoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold break-all">
                                      {localSubmission.gitRepoUrl}
                                    </a>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-muted-foreground block">Design Report:</span>
                                    <a href={localSubmission.documentationUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold break-all">
                                      {localSubmission.documentationUrl}
                                    </a>
                                  </div>
                                </div>

                                {localSubmission.score !== null && (
                                  <div className="bg-secondary/20 border border-border/40 p-4 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Grade Evaluation</span>
                                      <span className="text-xs font-black text-foreground">{localSubmission.score} / 100</span>
                                    </div>
                                    {localSubmission.feedback && (
                                      <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                        "{localSubmission.feedback}"
                                      </p>
                                    )}
                                  </div>
                                )}

                                {localSubmission.status !== "approved" && (
                                  <button
                                    onClick={() => setIsResubmitting(true)}
                                    disabled={user.role === "Guest"}
                                    className="w-full h-10 rounded-xl text-xs font-extrabold border border-border hover:bg-secondary flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {user.role === "Guest" ? "Read Only" : "Edit and Re-submit Project"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              /* Submission Form */
                              <form onSubmit={handleProjectSubmit} className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-200">
                                <div className="border-b border-border/80 pb-3">
                                  <h4 className="text-xs font-extrabold text-foreground">
                                    {isResubmitting ? "Edit Project Submission" : "Submit Your Capstone Project"}
                                  </h4>
                                  <p className="text-[10px] text-muted-foreground">Provide repository and design documentation URLs below.</p>
                                </div>

                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Git Repository URL</label>
                                    <input
                                      type="url"
                                      required
                                      placeholder="https://github.com/username/vlsi-capstone"
                                      value={projectGitUrl}
                                      onChange={(e) => setProjectGitUrl(e.target.value)}
                                      className="w-full px-3.5 py-2 bg-secondary/25 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Design Report / PDF Link</label>
                                    <input
                                      type="url"
                                      required
                                      placeholder="https://drive.google.com/file/d/.../view"
                                      value={projectDocUrl}
                                      onChange={(e) => setProjectDocUrl(e.target.value)}
                                      className="w-full px-3.5 py-2 bg-secondary/25 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-3">
                                  {isResubmitting && (
                                    <button
                                      type="button"
                                      onClick={() => setIsResubmitting(false)}
                                      className="flex-1 h-10 rounded-xl text-xs font-extrabold border border-border hover:bg-secondary flex items-center justify-center transition-all cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                  <button
                                    type="submit"
                                    disabled={submittingProject || user.role === "Guest"}
                                    className="flex-[2] h-10 rounded-xl text-xs font-extrabold text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    {submittingProject ? "Submitting..." : user.role === "Guest" ? "Read Only" : "Submit Project"}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "subjective" && (
                      <div className="space-y-6 max-w-3xl">
                        {!activeLesson ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-lg">
                              📝
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-foreground">Select a Lesson</h4>
                              <p className="text-[10px] text-muted-foreground">Select a lesson from the curriculum roadmap outline to submit subjective work.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {(() => {
                              const sub = localSubmissionsList.find((s) => s.lessonId === activeLesson.id);
                              const promptText = `Please write a subjective summary or analysis based on this lesson: ${activeLesson.title}. Analyze the core concepts, their practical implementation in semiconductor/VLSI design, and explain the key trade-offs involved.`;
                              return (
                                <div className="space-y-6">
                                  {/* Assignment / Rubric info */}
                                  <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-border p-5 rounded-2xl space-y-4">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Subjective Assessment</span>
                                        <h3 className="text-sm font-extrabold text-foreground mt-0.5">{activeLesson.title} - Analysis Essay</h3>
                                      </div>
                                      {sub && (
                                        <span className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${sub.status === "graded" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"}`}>
                                          {sub.status}
                                        </span>
                                      )}
                                    </div>
                                    <div className="p-3.5 bg-card/65 rounded-xl border border-border/40 space-y-2">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rubric Criteria Details</h4>
                                      <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-4 font-semibold">
                                        <li>Technical Correctness (40%): Evaluation of silicon design principles.</li>
                                        <li>Clarity & Structure (30%): Structure, flow, and terminology accuracy.</li>
                                        <li>Completeness (30%): Depth of coverage of all micro-circuit scaling trade-offs.</li>
                                      </ul>
                                    </div>
                                  </div>

                                  {sub && sub.status === "graded" && (
                                    <div className="sexy-border-glow bg-card/45 backdrop-blur-md p-5 rounded-2xl space-y-4">
                                      <div className="border-b border-border/60 pb-3 flex justify-between items-center">
                                        <div>
                                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Grading Evaluation Scorecard</h4>
                                          <p className="text-[9px] text-muted-foreground">Manually evaluated by faculty assessor.</p>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-2xl font-black text-primary" style={{ color: primaryColor }}>{sub.score}</span>
                                          <span className="text-xs text-muted-foreground font-bold"> / 100</span>
                                        </div>
                                      </div>

                                      {sub.rubrics && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          {sub.rubrics.map((rub: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-secondary/15 rounded-xl border border-border/40 text-left">
                                              <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase text-foreground">{rub.criteria}</span>
                                                <span className="text-[10px] font-mono font-black text-primary" style={{ color: primaryColor }}>{rub.score}/{rub.maxScore}</span>
                                              </div>
                                              {rub.feedback && (
                                                <p className="text-[9.5px] text-muted-foreground mt-2 italic leading-relaxed">"{rub.feedback}"</p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {sub.feedback && (
                                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-left" style={{ borderColor: `${primaryColor}20`, backgroundColor: `${primaryColor}05` }}>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1" style={{ color: primaryColor }}>Evaluator Feedback Comments</span>
                                          <p className="text-[10px] text-foreground leading-relaxed italic">"{sub.feedback}"</p>
                                        </div>
                                      )}

                                      {sub.history && sub.history.length > 1 && (
                                        <div className="pt-2">
                                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Evaluation History Logs</span>
                                          <div className="space-y-2 border-l border-border/60 pl-3">
                                            {sub.history.map((hist: any, hIdx: number) => (
                                              <div key={hIdx} className="text-[9.5px] text-muted-foreground">
                                                <span className="font-extrabold text-foreground">Score: {hist.score}/100</span> &middot; Graded by {hist.evaluatedBy} on {formatReadableDate(hist.evaluatedAt)}
                                                {hist.feedback && <p className="italic text-muted-foreground/80 mt-0.5">"{hist.feedback}"</p>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {(!sub || sub.status === "pending" || user.role !== "Guest") && (
                                    <form onSubmit={handleSubjectiveSubmit} className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-200">
                                      <div className="border-b border-border/80 pb-3">
                                        <h4 className="text-xs font-extrabold text-foreground">
                                          {sub ? "Resubmit Your Assignment" : "Submit Subjective Analysis Response"}
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground">{promptText}</p>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Your Answer / Essay Response</label>
                                        <textarea
                                          required
                                          rows={10}
                                          placeholder="Write your detailed technical response here. Ensure clarity, completeness, and mention specific equations or trade-offs where applicable..."
                                          value={subjectiveAnswer}
                                          onChange={(e) => setSubjectiveAnswer(e.target.value)}
                                          className="w-full px-3.5 py-3 bg-secondary/25 border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground leading-relaxed font-sans"
                                        />
                                      </div>

                                      <div className="flex gap-3">
                                        <button
                                          type="submit"
                                          disabled={submittingSubjective || user.role === "Guest"}
                                          className="flex-1 h-10 rounded-xl text-xs font-extrabold text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                          style={{ backgroundColor: primaryColor }}
                                        >
                                          {submittingSubjective ? "Submitting..." : sub ? "Resubmit Analysis" : "Submit Answer"}
                                        </button>
                                      </div>
                                    </form>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            );
          })()
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs space-y-2">
            <span>Select a lesson or quiz from the curriculum roadmap outline to begin learning.</span>
          </div>
        )}
      </div>

      {/* Floating AI Assistant pane */}
      {enableAi && (
        <aside 
          className={`bg-card border-l border-border flex flex-col transition-all duration-300 shrink-0 ${
            aiOpen ? "w-80" : "w-0"
          } overflow-hidden`}
        >
          <div className="p-4 border-b border-border/80 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Assistant Console
            </span>
          </div>

          {/* Bot Tabs Selector */}
          <div className="flex border-b border-border bg-muted/20 shrink-0">
            <button
              onClick={() => setActiveBot("tutor")}
              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                activeBot === "tutor"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={activeBot === "tutor" ? { borderColor: primaryColor, color: primaryColor } : undefined}
            >
              🤖 Tutor
            </button>
            <button
              onClick={() => setActiveBot("book")}
              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                activeBot === "book"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={activeBot === "book" ? { borderColor: primaryColor, color: primaryColor } : undefined}
            >
              📚 Book
            </button>
            <button
              onClick={() => setActiveBot("score")}
              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                activeBot === "score"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={activeBot === "score" ? { borderColor: primaryColor, color: primaryColor } : undefined}
            >
              🎯 Score
            </button>
          </div>
          
          {/* Chat output */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiMessages.map((msg, idx) => {
              const hasRag = msg.sender === "ai" && msg.rag && msg.rag.length > 0;
              const isExpanded = !!expandedRagIndices[idx];

              return (
                <div key={idx} className="space-y-1">
                  <div 
                    className={`p-3 rounded-xl text-xs leading-relaxed border ${
                      msg.sender === "user" 
                        ? "bg-secondary/30 border-border max-w-[85%] ml-auto" 
                        : "bg-primary/5 border-primary/25 text-foreground max-w-[90%]"
                    }`}
                  >
                    {renderFormattedContent(msg.text, primaryColor)}
                    
                    {hasRag && (
                      <div className="mt-2.5 pt-2 border-t border-primary/10">
                        <button
                          type="button"
                          onClick={() => setExpandedRagIndices(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className="flex items-center gap-1 text-[8.5px] font-black uppercase text-primary tracking-wider hover:underline cursor-pointer"
                          style={{ color: primaryColor }}
                        >
                          <BrainCircuit className="w-3 h-3 shrink-0" />
                          {isExpanded ? "Hide RAG Sources ▴" : "Show RAG Sources ▾"}
                        </button>
                        
                        {isExpanded && (
                          <div className="mt-2 space-y-2 animate-in slide-in-from-top-1 duration-150">
                            {msg.rag!.map((chunk: any, cIdx: number) => (
                              <div key={cIdx} className="bg-background/80 border border-border/50 p-2 rounded-lg space-y-1 text-[9.5px]">
                                <div className="flex justify-between items-center text-[8.5px] text-muted-foreground font-semibold">
                                  <span className="truncate max-w-[130px] font-sans font-bold text-foreground" title={chunk.source}>
                                    📄 {chunk.source} (Page {chunk.page})
                                  </span>
                                  <span className="font-mono text-emerald-400">Match: {(chunk.score * 100).toFixed(0)}%</span>
                                </div>
                                <p className="text-muted-foreground italic leading-normal font-medium">
                                  &ldquo;{chunk.snippet}&rdquo;
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {msg.sender === "ai" && activeBot === "book" && (
                      <div className="mt-2 flex items-center justify-end border-t border-primary/10 pt-2">
                        <button
                          type="button"
                          onClick={() => toggleSpeak(msg.text, idx)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/30 hover:bg-secondary/50 text-[9px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        >
                          {speakingIndex === idx ? (
                            <>
                              <VolumeX className="w-3 h-3 text-rose-500 animate-pulse" />
                              <span>Stop Reading</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3 text-primary" style={{ color: primaryColor }} />
                              <span>Read Aloud</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Interactive Dynamic generated components */}
            {flashcards.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Interactive Flashcards</span>
                {flashcards.map((fc, i) => (
                  <div key={i} className="bg-secondary/15 border border-border p-3 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-foreground">Q: {fc.q}</p>
                    {fc.showAnswer ? (
                      <p className="text-[11px] text-muted-foreground leading-relaxed animate-in fade-in">A: {fc.a}</p>
                    ) : (
                      <button
                        onClick={() => {
                          setFlashcards(prev => prev.map((item, idx) => idx === i ? { ...item, showAnswer: true } : item));
                        }}
                        className="text-[9px] font-black bg-primary/20 text-primary px-2.5 py-1 rounded-lg hover:opacity-90"
                        style={{ color: primaryColor, backgroundColor: `${primaryColor}20` }}
                      >
                        Flip Card
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {customQuiz.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border/40">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Self-Assessment Quiz</span>
                {customQuiz.map((item, i) => (
                  <div key={i} className="bg-secondary/15 border border-border p-3 rounded-xl space-y-2.5">
                    <p className="text-xs font-bold text-foreground">{i + 1}. {item.q}</p>
                    <div className="space-y-1.5">
                      {item.opts.map((opt, oIdx) => {
                        const isSel = item.selected === oIdx;
                        const isCorrect = item.answer === oIdx;
                        return (
                          <button
                            key={oIdx}
                            onClick={() => {
                              setCustomQuiz(prev => prev.map((q, qIdx) => qIdx === i ? { ...q, selected: oIdx } : q));
                              if (oIdx === item.answer) {
                                confetti({ particleCount: 25, spread: 30, origin: { y: 0.8 } });
                              }
                            }}
                            className={`w-full text-left p-2 rounded-lg text-[10px] font-semibold border transition-all ${
                              item.selected !== undefined
                                ? isCorrect
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/35"
                                  : isSel
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/35"
                                    : "bg-transparent text-muted-foreground border-border"
                                : "bg-background text-muted-foreground border-border hover:border-slate-500"
                            }`}
                            disabled={item.selected !== undefined}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aiLoading && (
              <div className="flex items-center justify-center p-3 text-muted-foreground text-xs gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {activeBot === "tutor" 
                    ? "Analyzing lesson transcript..." 
                    : activeBot === "book" 
                      ? "Searching digital library catalog..." 
                      : "Calculating score analytics report..."}
                </span>
              </div>
            )}
          </div>

          {/* AI Action Shortcuts */}
          <div className="p-3 bg-secondary/15 border-t border-border space-y-2 shrink-0">
            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-wider block mb-1">Quick Tools</span>
            
            {activeBot === "tutor" && (
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  onClick={() => askAI("Summarize Lesson")}
                  className="px-2 py-1 text-[9px] font-bold border border-border bg-card hover:bg-secondary rounded-lg text-center"
                >
                  Summary
                </button>
                <button 
                  onClick={() => askAI("Generate Flashcards")}
                  className="px-2 py-1 text-[9px] font-bold border border-border bg-card hover:bg-secondary rounded-lg text-center"
                >
                  Flashcards
                </button>
                <button 
                  onClick={() => askAI("Quiz me")}
                  className="px-2 py-1 text-[9px] font-bold border border-border bg-card hover:bg-secondary rounded-lg text-center"
                >
                  Quiz Me
                </button>
              </div>
            )}

            {activeBot === "book" && (
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  onClick={() => askAI("CMOS VLSI")}
                  className="px-2 py-1 text-[9px] font-bold border border-border bg-card hover:bg-secondary rounded-lg text-center truncate"
                >
                  CMOS Books
                </button>
                <button 
                  onClick={() => askAI("Lithography")}
                  className="px-2 py-1 text-[9px] font-bold border border-border bg-card hover:bg-secondary rounded-lg text-center truncate"
                >
                  Lithography
                </button>
                <button 
                  onClick={() => askAI("FinFET")}
                  className="px-2 py-1 text-[9px] font-bold border border-border bg-card hover:bg-secondary rounded-lg text-center truncate"
                >
                  FinFET Docs
                </button>
              </div>
            )}

            {activeBot === "score" && (
              <div className="flex gap-1.5">
                <button 
                  onClick={() => askAI("Show my score report card")}
                  className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider border border-border bg-card hover:bg-secondary rounded-lg text-center text-primary"
                  style={{ color: primaryColor }}
                >
                  📊 Run Performance Score Audit
                </button>
              </div>
            )}
          </div>

          {/* Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              askAI();
            }} 
            className="p-3 border-t border-border shrink-0 flex gap-1.5"
          >
            <input
              type="text"
              placeholder={
                activeBot === "tutor" 
                  ? "Ask about this lesson..." 
                  : activeBot === "book" 
                    ? "Search books, authors, categories..." 
                    : "Ask score bot coach..."
              }
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="flex-1 bg-secondary/20 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="bg-primary text-white p-1.5 rounded-xl hover:opacity-95 flex items-center justify-center transition-colors cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      )}

      {/* Collapse AI Button */}
      {enableAi && (
        <button
          onClick={() => setAiOpen(!aiOpen)}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-20 w-5 h-10 bg-card border-l border-y border-border hover:bg-secondary flex items-center justify-center text-muted-foreground rounded-l-lg"
        >
          {aiOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* CAREER SCORECARD DOWNLOADABLE MODAL */}
      {isScorecardOpen && scorecardData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-6xl bg-white text-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col p-6 space-y-6 max-h-[95vh]">
            
            {/* Modal Actions Bar (No Print) */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  🏆 Interactive Career Scorecard Simulator
                </h3>
                <p className="text-xs text-slate-500 font-semibold font-sans">Verify visual elements, download/print PDF matching the design specification.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintScorecard}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  📥 Download / Print PDF Scorecard
                </button>
                <button
                  onClick={() => setIsScorecardOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Area Wrapper */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div id="career-scorecard-print-area" className="bg-white text-slate-800 p-8 rounded-2xl flex flex-col space-y-6 relative border border-slate-100 min-w-[1000px]">
                
                {/* 1. Header Row */}
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
                  {/* Left: Branding Logo */}
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-sm shadow-md"
                      style={{ backgroundColor: brand.logoColor }}
                    >
                      {brand.logoText}
                    </span>
                    <div>
                      <h2 className="text-sm font-black tracking-wider text-slate-800 leading-tight">{brand.logoSubtext}</h2>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Center of Excellence</p>
                    </div>
                  </div>

                  {/* Center: Title & Slogan */}
                  <div className="text-center space-y-0.5">
                    <h1 
                      className="text-lg md:text-xl font-black uppercase tracking-wider"
                      style={{ color: brand.logoColor }}
                    >
                      {brand.logoText} CAREER SCORECARD
                    </h1>
                    <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 font-semibold">
                      <span>🍃 Your Journey.</span>
                      <span>Your Growth.</span>
                      <span>Your Impact. 🍃</span>
                    </div>
                  </div>

                  {/* Right: Student Avatar & Info */}
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 rounded-2xl">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-200 shrink-0 flex items-center justify-center text-slate-500">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-xs font-black text-slate-800">{scorecardData.studentName}</h3>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{brand.pathway}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Top row metrics cards */}
                <div className="grid grid-cols-5 gap-4 text-left">
                  {/* Metric 1: Overall Score */}
                  <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-2xl flex flex-col justify-between h-24">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{brand.logoText} OVERALL SCORE</span>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-black text-slate-800">{totalScorePoints} <span className="text-slate-400 text-xs font-bold">/ 1000</span></p>
                        <span className="text-[8px] text-emerald-600 font-black block mt-0.5">{overallAverageScore}% Performance</span>
                      </div>
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="3" fill="transparent" />
                          <circle cx="24" cy="24" r="20" stroke={brand.logoColor} strokeWidth="3" fill="transparent" 
                                  strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * overallAverageScore) / 100} />
                        </svg>
                        <span className="absolute text-[9px] font-black text-slate-800">{overallAverageScore}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 2: Progress Over Time */}
                  <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-2xl flex flex-col justify-between h-24">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">PROGRESS OVER TIME</span>
                    <div className="h-14 flex flex-col justify-end">
                      <svg className="w-full h-10" viewBox="0 0 140 40">
                        <path d="M10,35 L30,28 L50,22 L70,18 L90,12 L110,8 L130,4" fill="none" stroke={brand.logoColor} strokeWidth="2" />
                        <circle cx="10" cy="35" r="2" fill={brand.accentColor} />
                        <circle cx="30" cy="28" r="2" fill={brand.accentColor} />
                        <circle cx="50" cy="22" r="2" fill={brand.accentColor} />
                        <circle cx="70" cy="18" r="2" fill={brand.accentColor} />
                        <circle cx="90" cy="12" r="2" fill={brand.accentColor} />
                        <circle cx="110" cy="8" r="2" fill={brand.accentColor} />
                        <circle cx="130" cy="4" r="2" fill={brand.accentColor} />
                        <line x1="10" y1="38" x2="130" y2="38" stroke="#e2e8f0" strokeWidth="1" />
                      </svg>
                      <div className="flex justify-between text-[7px] text-slate-400 font-bold px-1 mt-1">
                        <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 3: Percentile Rank */}
                  <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-2xl flex items-center gap-3 h-24">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M6 12a6 6 0 0 1 12 0c0 3-3 6-6 6s-6-3-6-6Z" />
                        <path d="M12 18v3" />
                        <path d="M8 21h8" />
                        <path d="m3 10 3 2 3-2" />
                        <path d="m21 10-3 2-3-2" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 block">PERCENTILE RANK</span>
                      <p className="text-base font-black text-slate-800">Top 12%</p>
                      <span className="text-[7px] text-slate-400 font-semibold block leading-tight">Among all {brand.logoText} Students</span>
                    </div>
                  </div>

                  {/* Metric 4: Reward Points */}
                  <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-2xl flex items-center gap-3 h-24">
                    <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M20 12v10H4V12" />
                        <path d="M2 7h20v5H2z" />
                        <path d="M12 22V7" />
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 block">REWARD POINTS</span>
                      <p className="text-base font-black text-slate-800">2,850</p>
                      <span className="inline-block mt-0.5 text-[6.5px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-widest">
                        Redeem Rewards
                      </span>
                    </div>
                  </div>

                  {/* Metric 5: Level Level */}
                  <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-2xl flex items-center gap-3 h-24">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 block">{brand.logoText} LEVEL</span>
                      <p className="text-xs font-black text-slate-800">Level 4 Leader</p>
                      <span className="text-[7px] text-slate-400 font-semibold block leading-tight">Outstanding roadmap progress!</span>
                    </div>
                  </div>
                </div>

                {/* 3. 10 Excellence Indices Header */}
                <div className="text-center relative">
                  <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-slate-100 z-0"></div>
                  <span className="relative z-10 px-4 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 rounded-full py-0.5">
                    10 Excellence Indices
                  </span>
                </div>

                {/* 4. Indices Grid */}
                <div className="grid grid-cols-5 gap-3.5 text-left">
                  {[
                    { id: 1, name: "Academic Excellence", keyPrograms: ["Microelectronics Theory", "Device Simulation Lab", "Roadmap Exams"] },
                    { id: 2, name: "Device Physics & GAA", keyPrograms: ["Sub-micron GAA Modeling", "Quantum Tunneling", "FinFET Architectures"] },
                    { id: 3, name: "Research & Innovation", keyPrograms: ["High-NA EUV Systems", "Advanced Lithography", "Patterning Innovation"] },
                    { id: 4, name: "Industry Relevance", keyPrograms: ["Static Timing Slack", "DRC & LVS Rule Checks", "Physical Synthesis"] },
                    { id: 5, name: "Leadership & Stakeholder", keyPrograms: ["Peer Design Review", "Project Collaboration", "Technical Mentoring"] },
                    { id: 6, name: "Cleanroom Practice", keyPrograms: ["Particulate Controls", "Wet Chemical Etching", "Safety Protocol Audit"] },
                    { id: 7, name: "Social Responsibility", keyPrograms: ["Circular Fab Water", "E-Waste Management", "STEM Outreach"] },
                    { id: 8, name: "Business Acumen", keyPrograms: ["Multi-Project Wafer Costs", "Foundry Supply Risk", "IP Block Integration"] },
                    { id: 9, name: "Global Readiness", keyPrograms: ["SECS/GEM Standards", "ISO Cleanroom Compliance", "Yield Analysis Tooling"] },
                    { id: 10, name: "Sustainability Citizenship", keyPrograms: ["Carbon-Neutral Foundry", "Ultra-Low Power Modes", "Clean Energy Sourcing"] },
                  ].map((idxData) => {
                    const score = indexScores[idxData.id - 1];
                    const rating = getRatingText(score);
                    
                    return (
                      <div key={idxData.id} className="border border-slate-100 p-3 rounded-2xl flex flex-col justify-between space-y-2 bg-slate-50/30">
                        {/* Title and Rating */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] font-black text-slate-800 leading-tight w-2/3">{idxData.id}. {idxData.name}</span>
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-800 block">{score} <span className="text-[8px] text-slate-400">/100</span></span>
                              <span className="text-[7px] font-bold text-slate-400 block uppercase tracking-wider">{rating}</span>
                            </div>
                          </div>
                          {/* Progress line */}
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: brand.logoColor }} />
                          </div>
                        </div>

                        {/* Key programs */}
                        <div className="space-y-0.5 border-t border-slate-100/80 pt-1.5">
                          <span className="text-[6.5px] font-black uppercase tracking-wider text-slate-400 block">Key Programs</span>
                          <ul className="list-disc pl-2 text-[6.5px] text-slate-500 font-semibold space-y-0.5">
                            {idxData.keyPrograms.map((prog, pIdx) => (
                              <li key={pIdx}>{prog}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 5. Bottom row layouts */}
                <div className="grid grid-cols-4 gap-4 pt-2">
                  {/* Left: Recent achievements */}
                  <div className="border border-slate-100 p-4 rounded-2xl flex flex-col justify-between space-y-3 bg-slate-50/20 text-left">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1.5">RECENT ACHIEVEMENTS</span>
                    <ul className="space-y-1.5 flex-1 pt-1">
                      {[
                        "CoE Semiconductor Internship - Fab Ecosystem",
                        "Strategic GAA Program Coordination with TSMC",
                        "Advanced Lithography Project Presentation",
                        "Cleanroom Safety Protocol Badge",
                        "Yield Optimization Case Study"
                      ].map((ach, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-1.5 text-[7.5px] font-semibold text-slate-600 leading-snug">
                          <span className="text-amber-500 text-xs shrink-0 leading-none">🏆</span>
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Center-Left: Readiness Dashboard */}
                  <div className="border border-slate-100 p-4 rounded-2xl flex flex-col justify-between space-y-3 bg-slate-50/20 text-left">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1.5">CAREER READINESS DASHBOARD</span>
                    <div className="space-y-2 flex-1 pt-1.5">
                      {[
                        { r: "VLSI Design Analyst", p: 92 },
                        { r: "Physical Layout Specialist", p: 90 },
                        { r: "Lithography Architect", p: 88 },
                        { r: "Cleanroom Yield Manager", p: 84 },
                        { r: "device Physics Specialist", p: 91 },
                        { r: "Tape-out Program Manager", p: 86 }
                      ].map((item, iIdx) => (
                        <div key={iIdx} className="space-y-0.5">
                          <div className="flex justify-between text-[7px] font-bold text-slate-600">
                            <span>{item.r}</span>
                            <span>{item.p}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${item.p}%`, backgroundColor: brand.accentColor }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Center-Right: Next steps */}
                  <div className="border border-slate-100 p-4 rounded-2xl flex flex-col justify-between space-y-3 bg-slate-50/20 text-left">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1.5">RECOMMENDED NEXT STEPS</span>
                    
                    <div className="flex-1 space-y-2.5 pt-1 text-[7px] leading-relaxed">
                      <div>
                        <strong className="text-slate-800 uppercase block font-black mb-0.5 text-[6.5px]">MICRO CREDENTIALS</strong>
                        <p className="text-slate-500 font-semibold">GAA Fet Modeling Practitioner | FinFET Specialist | Yield Analytics with AI</p>
                      </div>
                      <div className="border-t border-slate-100 pt-1.5">
                        <strong className="text-slate-800 uppercase block font-black mb-0.5 text-[6.5px]">INDUSTRY CERTIFICATIONS</strong>
                        <p className="text-slate-500 font-semibold">ASML EUV Lithography certification | IEEE VLSI Professional | ISO Cleanroom Auditor</p>
                      </div>
                      <div className="border-t border-slate-100 pt-1.5">
                        <strong className="text-slate-800 uppercase block font-black mb-0.5 text-[6.5px]">SPECIALIZATION PATHWAY</strong>
                        <div className="flex justify-between items-center text-[6px] text-slate-400 font-black mt-1 uppercase tracking-wider">
                          <span className="text-emerald-600">L1: Assoc</span>
                          <span>➜</span>
                          <span className="text-emerald-600">L2: Analyst</span>
                          <span>➜</span>
                          <span>L3: Cons</span>
                          <span>➜</span>
                          <span>L4: Spec</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score Summary */}
                  <div className="border border-slate-100 p-4 rounded-2xl flex flex-col justify-between bg-slate-50/25 text-center space-y-3">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1.5">SCORE SUMMARY</span>
                    
                    {/* Ring and summary */}
                    <div className="flex-1 flex flex-col justify-center items-center space-y-2">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="4.5" fill="transparent" />
                          <circle cx="32" cy="32" r="26" stroke={brand.logoColor} strokeWidth="4.5" fill="transparent" 
                                  strokeDasharray="163.3" strokeDashoffset={163.3 - (163.3 * overallAverageScore) / 100} />
                        </svg>
                        <div className="absolute text-center leading-none">
                          <span className="text-xs font-black text-slate-800">{overallAverageScore}%</span>
                          <span className="text-[6px] text-slate-400 font-bold block uppercase tracking-widest mt-0.5">Indices</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[8px] w-full pt-1.5 text-left">
                        <div className="border-r border-slate-100 pl-1">
                          <span className="text-slate-400 font-bold block text-[6.5px] uppercase">TOTAL SCORE</span>
                          <strong className="text-slate-800 text-sm font-black">{totalScorePoints}/1000</strong>
                        </div>
                        <div className="pl-1">
                          <span className="text-slate-400 font-bold block text-[6.5px] uppercase">CAREER GRADE</span>
                          <strong className="text-emerald-600 text-sm font-black">{gradeLetter}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Footer section with final assessment */}
                <div className="grid grid-cols-12 gap-4 border-t border-slate-100 pt-4 items-center">
                  <div className="col-span-5 bg-emerald-950 text-emerald-100 p-3 rounded-2xl text-[7.5px] leading-relaxed text-left">
                    <strong className="text-emerald-400 uppercase tracking-widest block font-black mb-1 text-[6.5px]">🛡️ FINAL PERFORMANCE ASSESSMENT</strong>
                    {scorecardData.studentName} demonstrates exceptional potential for physical synthesis, advanced lithography, and CAD/EDA engineering. Their combination of deep VLSI theory, sub-micron physical modeling, and team collaboration reviews places them among the strongest early-career professionals in the industry.
                  </div>

                  <div className="col-span-4 flex items-center gap-2 px-2 text-left">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-full shrink-0">
                      🌍
                    </div>
                    <p className="text-[7px] text-slate-500 font-semibold leading-relaxed">
                      You are building a better tomorrow. Keep contributing. Keep inspiring. The world needs engineering and research leaders like you!
                    </p>
                  </div>

                  <div className="col-span-3 text-right space-y-0.5">
                    <span className="text-[7.5px] text-slate-400 font-bold block uppercase tracking-widest">Together, we build a better tomorrow.</span>
                    <strong className="text-slate-800 text-xs font-bold block" style={{ color: brand.logoColor }}>{brand.domain}</strong>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
