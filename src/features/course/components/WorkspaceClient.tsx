"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, Video, FileText, ChevronLeft, ChevronRight, Sparkles, 
  Edit3, HelpCircle, MessageSquare, Award, Play, CheckCircle, 
  Send, RefreshCw, Download, Award as BadgeIcon, BrainCircuit, ShieldAlert,
  HelpCircle as QuestionIcon
} from "lucide-react";
import confetti from "canvas-confetti";
import { QuizWorkspace } from "@/features/quiz/components/QuizWorkspace";
import { toggleLessonCompletionAction, submitProjectAction } from "../actions/course-actions";

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
  capstoneProject?: any | null;
  capstoneSubmission?: any | null;
  tenantName: string;
  primaryColor?: string;
  user: {
    userId: string;
    firstName: string;
    lastName: string;
  };
}

export function WorkspaceClient({ 
  course, 
  quizzes, 
  activeLesson, 
  activeQuiz, 
  completedLessonIds = [],
  capstoneProject,
  capstoneSubmission,
  tenantName, 
  primaryColor = "#0ea5e9",
  user
}: WorkspaceClientProps) {
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"material" | "whiteboard" | "notes" | "chat" | "capstone">("material");

  // Lesson completions
  const [completedLessons, setCompletedLessons] = useState<string[]>(completedLessonIds);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
  const [aiQuery, setAiQuery] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Hello! I am your AI Semiconductor Assistant. Ask me anything about today's lesson, or use the shortcuts below to summarize or quiz yourself." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Array<{ q: string; a: string; showAnswer?: boolean }>>([]);
  const [customQuiz, setCustomQuiz] = useState<Array<{ q: string; opts: string[]; answer: number; selected?: number }>>([]);

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
  }, [activeLesson]);

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

  const handleToggleComplete = async (lessonId: string) => {
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
    const queryText = customPrompt || aiQuery;
    if (!queryText.trim()) return;

    if (!customPrompt) {
      setAiMessages(prev => [...prev, { sender: "user", text: queryText }]);
      setAiQuery("");
    }
    setAiLoading(true);

    setTimeout(() => {
      let aiResponse = "I am processing your query based on current lecture transcript notes.";
      
      const lessonTitle = activeLesson?.title.toLowerCase() || "";
      if (queryText.includes("summarize") || queryText.includes("Summary")) {
        aiResponse = `Here is a structured summary of "${activeLesson?.title || "today's lesson"}":
• **Core Objective**: Master the physical operations, structures, and limits of current semiconductors.
• **Key Terms**: Sub-threshold slope, leakage current, photo-resist degradation, and optical diffraction thresholds.
• **Significance**: Understanding these parameters is critical to ensuring VLSI layouts successfully pass physical verification rules.`;
      } else if (queryText.includes("flashcard") || queryText.includes("Flashcards")) {
        setFlashcards([
          { q: "What is the primary function of a photoresist in lithography?", a: "A light-sensitive polymer applied to the wafer. Exposure to UV light through a mask modifies its chemical solubility, allowing patterns to be etched." },
          { q: "Explain sub-threshold leakage.", a: "The current that flows between source and drain even when the gate-source voltage is below the threshold voltage (Vth). Crucial to minimize in mobile designs." }
        ]);
        aiResponse = "I have generated 2 interactive learning flashcards for you! See them in the AI panel below.";
      } else if (queryText.includes("quiz") || queryText.includes("Quiz")) {
        setCustomQuiz([
          {
            q: "What parameter limits resolution in optical lithography?",
            opts: ["Light wavelength (lambda)", "Transistor channel length", "Substrate doping density", "Metal layer thickness"],
            answer: 0
          },
          {
            q: "Which state describes a transistor turned fully off but still leaking current?",
            opts: ["Saturation", "Sub-threshold conduction", "Linear operation", "Avalanche breakdown"],
            answer: 1
          }
        ]);
        aiResponse = "I have compiled a 2-question quick test based on this module. Complete it in the assistant panel below!";
      } else {
        aiResponse = `Regarding "${queryText}": In modern semiconductor fabrication, this relates directly to ensuring high yields on advanced nodes (e.g. 3nm FinFET). The structural limitations dictate that we must model thermal dissipation, layout parasitics, and leakage profiles accurately to avoid chip failure.`;
      }

      setAiMessages(prev => [...prev, { sender: "ai", text: aiResponse }]);
      setAiLoading(false);
    }, 1200);
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
                  return (
                    <div key={les.id} className="space-y-0.5">
                      <a
                        href={`/courses/${course.id}?lessonId=${les.id}`}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          isActive 
                            ? "bg-primary/10 text-primary border-l-2" 
                            : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                        }`}
                        style={isActive ? { borderLeftColor: primaryColor, color: primaryColor } : undefined}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="shrink-0 text-sm">
                            {les.contentType === "video" ? "📺" : les.contentType === "live_class" ? "🎥" : "📄"}
                          </span>
                          <span className="truncate flex-1">{les.title}</span>
                        </div>
                        {completedLessons.includes(les.id) && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                      </a>

                      {lessonQuiz && (
                        <a
                          href={`/courses/${course.id}?quizId=${lessonQuiz.id}`}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 pl-8 rounded-xl text-[10px] font-extrabold transition-all ${
                            activeQuizId === lessonQuiz.id
                              ? "bg-amber-500/10 text-amber-500 border-l-2 border-amber-500" 
                              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                          }`}
                        >
                          <span>✍️</span>
                          <span className="truncate flex-1">{lessonQuiz.title}</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
        {activeQuiz ? (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 bg-card/10">
            <QuizWorkspace 
              quiz={activeQuiz} 
              tenantName={tenantName}
              primaryColor={primaryColor}
            />
          </div>
        ) : activeLesson ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Viewport: Video, PDF text, or Zoom */}
            <div className="bg-card/35 border-b border-border shrink-0">
              {activeLesson.contentType === "video" && activeLesson.videoUrl && (
                <div className="aspect-video max-h-[38vh] mx-auto bg-black relative flex items-center justify-center">
                  <video 
                    src={activeLesson.videoUrl} 
                    controls 
                    className="w-full h-full object-contain"
                    poster="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1200"
                  />
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
            </div>

            {/* Split Tab Panel below Viewport */}
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Tab Navigation header */}
              <div className="h-11 border-b border-border bg-card/25 flex items-center justify-between px-6 shrink-0">
                <div className="flex gap-2">
                  {((): any[] => {
                    const list = [
                      { id: "material", label: "Study Materials", icon: FileText },
                      { id: "whiteboard", label: "Drawing Board", icon: BrainCircuit },
                      { id: "notes", label: "Notebook", icon: Edit3 },
                      { id: "chat", label: "Discussion Hub", icon: MessageSquare }
                    ];
                    if (capstoneProject) {
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
                
                {activeTab === "notes" && (
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1.5">
                    {notesSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 text-emerald-400" />}
                    {notesSaving ? "Saving..." : "Saved to Local Storage"}
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
                          href={activeLesson.fileUrl} 
                          download
                          target="_blank"
                          rel="noreferrer"
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
                        disabled={updatingProgress}
                        className={`h-10 px-5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                          completedLessons.includes(activeLesson.id)
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                            : "text-white hover:opacity-95"
                        }`}
                        style={!completedLessons.includes(activeLesson.id) ? { backgroundColor: primaryColor } : undefined}
                      >
                        {completedLessons.includes(activeLesson.id) ? (
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
                                className="w-full h-10 rounded-xl text-xs font-extrabold border border-border hover:bg-secondary flex items-center justify-center transition-all cursor-pointer"
                              >
                                Edit and Re-submit Project
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
                                disabled={submittingProject}
                                className="flex-[2] h-10 rounded-xl text-xs font-extrabold text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                              >
                                {submittingProject ? "Submitting..." : "Submit Project"}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs space-y-2">
            <span>Select a lesson or quiz from the curriculum roadmap outline to begin learning.</span>
          </div>
        )}
      </div>

      {/* Floating AI Assistant pane */}
      <aside 
        className={`bg-card border-l border-border flex flex-col transition-all duration-300 shrink-0 ${
          aiOpen ? "w-80" : "w-0"
        } overflow-hidden`}
      >
        <div className="p-4 border-b border-border/80 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Tutor Assistant
          </span>
        </div>
        
        {/* Chat output */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {aiMessages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-xl text-xs leading-relaxed border ${
                msg.sender === "user" 
                  ? "bg-secondary/30 border-border max-w-[85%] ml-auto" 
                  : "bg-primary/5 border-primary/25 text-foreground max-w-[90%]"
              }`}
            >
              {msg.text}
            </div>
          ))}

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
              <span>Analyzing lesson transcript...</span>
            </div>
          )}
        </div>

        {/* AI Action Shortcuts */}
        <div className="p-3 bg-secondary/15 border-t border-border space-y-2 shrink-0">
          <span className="text-[8px] font-black uppercase text-muted-foreground tracking-wider block mb-1">Quick Tools</span>
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
            placeholder="Ask about this lesson..."
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

      {/* Collapse AI Button */}
      <button
        onClick={() => setAiOpen(!aiOpen)}
        className="absolute top-1/2 -translate-y-1/2 right-0 z-20 w-5 h-10 bg-card border-l border-y border-border hover:bg-secondary flex items-center justify-center text-muted-foreground rounded-l-lg"
      >
        {aiOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

    </div>
  );
}
