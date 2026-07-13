"use client";

import React, { useState, useEffect } from "react";
import { submitQuizAttemptAction } from "../actions/quiz-actions";
import { ArrowRight } from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options: { id: string; text: string }[];
  order: number;
}

interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  passingScore: number;
  questions: Question[];
}

interface QuizWorkspaceProps {
  quiz: Quiz;
  tenantName: string;
  primaryColor?: string;
  enableProctoring?: boolean;
}

export function QuizWorkspace({ quiz, tenantName, primaryColor, enableProctoring = false }: QuizWorkspaceProps) {
  const [step, setStep] = useState<"intro" | "questions" | "results">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsData, setResultsData] = useState<any | null>(null);
  const [unlockedCert, setUnlockedCert] = useState(false);
  const [certCode, setCertCode] = useState("");

  const [infractionCount, setInfractionCount] = useState(0);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);

  const answersRef = React.useRef(answers);
  React.useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const triggerAutoSubmit = async (currentInfractions: number) => {
    setLoading(true);
    try {
      const formattedAnswers = Object.entries(answersRef.current).map(([qId, optId]) => ({
        questionId: qId,
        selectedOptionId: optId,
      }));

      const res = await submitQuizAttemptAction(quiz.id, formattedAnswers, currentInfractions);
      if (res.success && res.data) {
        setResultsData(res.data);
        setStep("results");
      } else {
        throw new Error(res.error || "Failed to auto-submit quiz.");
      }
    } catch (err: any) {
      setError(err.message || "Auto-submission error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enableProctoring || step !== "questions") return;

    const handleInfraction = (msg: string) => {
      setInfractionCount((prev) => {
        const next = prev + 1;
        setProctorWarning(`Proctoring Alert: ${msg} detected. Infraction logged (${next}/3).`);
        setTimeout(() => setProctorWarning(null), 5000);

        if (next >= 3) {
          setError("Session terminated: Too many proctoring infractions detected.");
          triggerAutoSubmit(next);
        }
        return next;
      });
    };

    const handleVisibility = () => {
      if (document.hidden) {
        handleInfraction("Tab switch / Window minimization");
      }
    };

    const handleBlur = () => {
      handleInfraction("Lost focus (clicked outside workspace)");
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleInfraction("Copy action");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handleInfraction("Paste action");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleInfraction("Right click action");
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [step, enableProctoring]);

  const handleStart = () => {
    setError(null);
    setAnswers({});
    setCurrentIdx(0);
    setUnlockedCert(false);
    setCertCode("");
    setInfractionCount(0);
    setProctorWarning(null);
    setStep("questions");
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers({
      ...answers,
      [questionId]: optionId,
    });
  };

  const currentQuestion = quiz.questions[currentIdx];

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      setError("Please select an answer to continue.");
      return;
    }
    setError(null);
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSubmit = async () => {
    if (!answers[currentQuestion.id]) {
      setError("Please select an answer to finalize submission.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const formattedAnswers = Object.entries(answers).map(([qId, optId]) => ({
        questionId: qId,
        selectedOptionId: optId,
      }));

      const res = await submitQuizAttemptAction(quiz.id, formattedAnswers, infractionCount);
      if (res.success && res.data) {
        setResultsData(res.data);
        setStep("results");

        // Dynamically call certificate auto-award check if they passed
        if (res.data.passed) {
          try {
            const { checkAndIssueCertificateAction } = await import("@/features/course/actions/certificate-actions");
            const certRes = await checkAndIssueCertificateAction(quiz.courseId);
            if (certRes.success) {
              setUnlockedCert(true);
              if (certRes.certificateCode) {
                setCertCode(certRes.certificateCode);
              }
            }
          } catch (e) {
            console.error("Certificate check failed:", e);
          }
        }
      } else {
        throw new Error(res.error || "Failed to submit answers.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "intro") {
    return (
      <div className="w-full max-w-xl bg-background border border-border rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-3">
          <span className="text-5xl">✍️</span>
          <h2 className="text-2xl font-extrabold text-foreground">{quiz.title}</h2>
          <p className="text-xs text-muted-foreground">
            {quiz.description || "Verify your semiconductor knowledge with this module assessment."}
          </p>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl space-y-3 text-xs">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Total Questions:</span>
            <span className="font-bold text-foreground">{quiz.questions.length} Questions</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Passing Grade:</span>
            <span className="font-bold text-primary">{quiz.passingScore}% Correct</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Host Institution:</span>
            <span className="font-semibold text-muted-foreground">{tenantName}</span>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full h-11 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:opacity-95"
          style={{ backgroundColor: primaryColor || "#0068B5" }}
        >
          Begin Assessment
        </button>
      </div>
    );
  }

  if (step === "questions") {
    const progress = Math.round(((currentIdx + 1) / quiz.questions.length) * 100);
    const selectedOptionId = answers[currentQuestion.id] || "";

    return (
      <div className="w-full max-w-xl bg-background border border-border rounded-2xl p-8 space-y-6 shadow-2xl">
        {/* Progress header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Question {currentIdx + 1} of {quiz.questions.length}</span>
            <span>{progress}% Completed</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: primaryColor || "#0068B5" }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-400">
            ⚠️ {error}
          </div>
        )}

        {proctorWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-400 font-semibold animate-pulse">
            🛡️ {proctorWarning}
          </div>
        )}

        {/* Question Text */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-foreground leading-relaxed">
            {currentQuestion.questionText}
          </h3>

          {/* Options List */}
          <div className="space-y-2.5 pt-2">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                  className={`w-full text-left p-4 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between ${
                    isSelected 
                      ? "bg-secondary text-secondary-foreground border-primary" 
                      : "bg-card/50 text-muted-foreground border-border hover:bg-card hover:text-foreground"
                  }`}
                  style={isSelected ? { borderColor: primaryColor } : undefined}
                >
                  <span>{opt.text}</span>
                  {isSelected && (
                    <span 
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                      style={{ backgroundColor: primaryColor || "#0068B5" }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="h-10 px-4 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:bg-card disabled:opacity-30 transition-all"
          >
            Back
          </button>

          {currentIdx < quiz.questions.length - 1 ? (
            <button
              onClick={handleNext}
              className="h-10 px-5 rounded-lg text-xs font-bold text-white transition-all shadow"
              style={{ backgroundColor: primaryColor || "#0068B5" }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="h-10 px-6 rounded-lg text-xs font-bold text-white transition-all shadow"
              style={{ backgroundColor: "#10B981" }} // emerald-500
            >
              {loading ? "Grading..." : "Submit Quiz"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === "results" && resultsData) {
    const isPass = resultsData.passed;

    return (
      <div className="w-full max-w-2xl bg-background border border-border rounded-2xl p-8 space-y-6 shadow-2xl my-6">
        {/* Pass/Fail banner */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card border border-border text-3xl">
            {isPass ? "🎉" : "😢"}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-foreground">
              {isPass ? "Assessment Passed!" : "Assessment Failed"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isPass 
                ? "Excellent job. You have met the minimum competency threshold." 
                : "You did not achieve the required passing score. Review the materials and retry."}
            </p>
          </div>
        </div>

        {/* Certificate Unlocked Alert */}
        {unlockedCert && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-5 rounded-xl flex items-center gap-4 text-left animate-in fade-in zoom-in duration-300">
            <span className="text-3xl">🎓</span>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completion Certificate Unlocked!</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Congratulations! You have qualified for a Center of Excellence credential. 
                Your certificate is registered with code <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono font-bold text-[10px]">{certCode}</code>.
              </p>
              <a 
                href="/progress" 
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:opacity-85 hover:underline pt-1"
              >
                Go to Progress & Analytics to download/print your credential <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Score Stats Grid */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-card border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Your Score</p>
            <p className={`text-2xl font-black mt-1 ${isPass ? "text-emerald-400" : "text-red-400"}`}>
              {resultsData.score}%
            </p>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Passing Grade</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {resultsData.passingScore}%
            </p>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Correct Answers</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {resultsData.correctCount} / {resultsData.totalQuestions}
            </p>
          </div>
        </div>

        {/* Detailed questions review */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            Questions Review
          </h3>

          <div className="space-y-4">
            {resultsData.details.map((q: any, i: number) => {
              const selectedOptText = q.options.find((o: any) => o.id === q.selectedOptionId)?.text || "Unanswered";
              const correctOptText = q.options.find((o: any) => o.id === q.correctOptionId)?.text || "";

              return (
                <div key={q.questionId} className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-muted-foreground">{i + 1}. {q.questionText}</span>
                    <span className={`text-sm shrink-0 ${q.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                      {q.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </span>
                  </div>

                  <div className="space-y-1.5 pl-4 border-l-2 border-border text-xs">
                    <p className="text-muted-foreground">
                      Your Answer: <strong className={q.isCorrect ? "text-emerald-400" : "text-red-400"}>{selectedOptText}</strong>
                    </p>
                    {!q.isCorrect && (
                      <p className="text-muted-foreground">
                        Correct Answer: <strong className="text-foreground">{correctOptText}</strong>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Re-take Action */}
        <button
          onClick={handleStart}
          className="w-full h-11 rounded-xl text-sm font-bold border border-border hover:bg-card text-foreground transition-all"
        >
          Retake Assessment Quiz
        </button>
      </div>
    );
  }

  return null;
}
