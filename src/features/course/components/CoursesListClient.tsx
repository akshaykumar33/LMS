"use client";

import React from "react";
import {
  BookOpen,
  ChevronRight,
  Layers,
  FileText,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface CourseItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  moduleCount: number;
  lessonCount: number;
  syllabus: string | null;
}

interface CoursesListClientProps {
  courses: CourseItem[];
  batchName: string;
  primaryColor: string;
}

export function CoursesListClient({
  courses,
  batchName,
  primaryColor,
}: CoursesListClientProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent border border-border rounded-3xl p-6 lg:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
            Active Curriculum
          </span>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground">
            Your Courses
          </h1>
          <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
            All courses assigned to your cohort{" "}
            <strong className="text-foreground">{batchName}</strong>. Select any
            course to enter the workspace.
          </p>
        </div>
      </div>

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course, idx) => {
            // Simulated progress — in production this comes from quiz/lesson completion data
            const simulatedProgress = Math.min(
              95,
              Math.max(5, ((idx * 37 + 15) % 80) + 10)
            );
            return (
              <div
                key={course.id}
                className="group bg-card border border-border hover:border-primary/40 rounded-2xl overflow-hidden transition-all hover:shadow-xl relative"
              >
                {/* Color accent bar */}
                <div
                  className="h-1 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88)`,
                  }}
                />

                <div className="p-6 space-y-4">
                  {/* Code badge + lesson count */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[9px] font-black px-2.5 py-1 rounded-md font-mono uppercase tracking-wider border"
                      style={{
                        color: primaryColor,
                        backgroundColor: `${primaryColor}15`,
                        borderColor: `${primaryColor}25`,
                      }}
                    >
                      {course.code}
                    </span>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {course.moduleCount} Modules
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {course.lessonCount} Lessons
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-extrabold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {course.name}
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {course.description}
                  </p>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                      <span>Progress</span>
                      <span>{simulatedProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${simulatedProgress}%`,
                          background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc)`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Syllabus preview */}
                  {course.syllabus && (
                    <div className="bg-secondary/20 border border-border/40 rounded-lg p-3 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                        Syllabus Preview
                      </span>
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 whitespace-pre-line">
                        {course.syllabus}
                      </p>
                    </div>
                  )}

                  {/* Enter button */}
                  <a
                    href={`/courses/${course.id}`}
                    className="mt-2 w-full h-10 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg hover:scale-[1.01] cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Enter Workspace{" "}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold text-foreground">
              No Courses Assigned Yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Your cohort curriculum hasn't been published yet. Check back soon
              or contact your program coordinator.
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> Return to Dashboard
          </a>
        </div>
      )}
    </div>
  );
}
