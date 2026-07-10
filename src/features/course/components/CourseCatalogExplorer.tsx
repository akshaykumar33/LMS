"use client";

import React, { useState } from "react";
import { ArrowRight, BookOpen, GraduationCap, Clock, CheckCircle2, Lock, X } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  contentType: string;
}

interface Module {
  id: string;
  name: string;
  description: string | null;
  lessons: Lesson[];
}

interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  modules: Module[];
}

interface CourseCatalogExplorerProps {
  courses: Course[];
  enrolledCourseIds: string[];
  isLoggedIn: boolean;
  primaryColor?: string;
}

export function CourseCatalogExplorer({
  courses,
  enrolledCourseIds,
  isLoggedIn,
  primaryColor = "#0ea5e9",
}: CourseCatalogExplorerProps) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-3 text-center md:text-left">
        <h2 className="text-2xl font-black text-foreground uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
          <GraduationCap className="w-7 h-7" style={{ color: primaryColor }} /> Explore Our Semiconductor Curriculum
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Inspect our graduate-level course structures, lecture contents, and syllabus. Lock in your admission to start.
        </p>
      </div>

      {/* Course Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => {
          const isEnrolled = enrolledCourseIds.includes(course.id);
          
          return (
            <div
              key={course.id}
              className="bg-card border border-border/80 rounded-2xl p-6 shadow-lg transition-all flex flex-col justify-between group"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = primaryColor;
                e.currentTarget.style.boxShadow = `0 10px 30px -10px ${primaryColor}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase border"
                    style={{ backgroundColor: primaryColor + "10", borderColor: primaryColor + "25", color: primaryColor }}
                  >
                    {course.code}
                  </span>
                  {isEnrolled && (
                    <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active Enrollment
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <h3 
                    className="text-lg font-bold text-foreground leading-tight transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.color = primaryColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = ""}
                  >
                    {course.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {course.description || "Comprehensive graduate specialization curriculum."}
                  </p>
                </div>

                {/* Modules outline preview */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider block border-b border-border pb-1">
                    Syllabus Outline
                  </span>
                  <div className="space-y-1.5">
                    {course.modules.slice(0, 3).map((mod) => (
                      <div key={mod.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor + "cc" }} />
                        <span className="truncate">{mod.name}</span>
                      </div>
                    ))}
                    {course.modules.length > 3 && (
                      <span className="text-[10px] italic text-muted-foreground/60 block pl-5">
                        + {course.modules.length - 3} more modules
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-6">
                <button
                  onClick={() => setSelectedCourse(course)}
                  className="flex-1 inline-flex items-center justify-center rounded-xl text-xs font-bold h-10 border border-border bg-surface hover:bg-surface-raised text-foreground transition-all gap-1 cursor-pointer"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {isEnrolled ? (
                  <a
                    href={`/courses/${course.id}`}
                    className="flex-1 inline-flex items-center justify-center rounded-xl text-xs font-bold h-10 text-white transition-opacity text-center shadow-md cursor-pointer hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Enter Workspace
                  </a>
                ) : (
                  <a
                    href={isLoggedIn ? "#" : "/admission/apply"}
                    onClick={(e) => {
                      if (isLoggedIn) {
                        e.preventDefault();
                        alert("You are already signed in. Please contact an admin to enroll in this batch course.");
                      }
                    }}
                    className={`flex-1 inline-flex items-center justify-center rounded-xl text-xs font-bold h-10 text-white transition-opacity text-center shadow-md ${
                      isLoggedIn ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground" : "hover:opacity-90 active:scale-[0.98] cursor-pointer"
                    }`}
                    style={{ backgroundColor: isLoggedIn ? undefined : primaryColor }}
                  >
                    {isLoggedIn ? "Apply Disabled" : "Apply & Buy"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-popover border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div className="space-y-1">
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase border"
                  style={{ backgroundColor: primaryColor + "10", borderColor: primaryColor + "25", color: primaryColor }}
                >
                  {selectedCourse.code}
                </span>
                <h3 className="text-xl font-extrabold text-foreground">
                  {selectedCourse.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-muted-foreground">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  Course Description
                </h4>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {selectedCourse.description || "No description provided."}
                </p>
              </div>

              {/* Complete Modules & Lessons list */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  Full Course Syllabus ({selectedCourse.modules.length} Modules)
                </h4>
                <div className="space-y-3">
                  {selectedCourse.modules.map((mod, idx) => (
                    <div
                      key={mod.id}
                      className="border border-border p-4 rounded-xl space-y-3 bg-surface"
                    >
                      <div className="flex justify-between items-center">
                        <h5 className="text-sm font-bold text-foreground">
                          Module {idx + 1}: {mod.name}
                        </h5>
                        {mod.description && (
                          <span className="text-[10px] text-muted-foreground italic">
                            Overview included
                          </span>
                        )}
                      </div>
                      {mod.lessons.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 pt-1 border-t border-border mt-1">
                          {mod.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between text-xs p-2 bg-surface-raised rounded border border-border"
                            >
                              <span className="text-muted-foreground font-medium truncate">
                                📄 {lesson.title}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide bg-secondary px-1.5 py-0.5 rounded">
                                {lesson.contentType}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">No topics loaded inside this module.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-secondary/40 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setSelectedCourse(null)}
                className="h-10 px-5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Close Explorer
              </button>
              {enrolledCourseIds.includes(selectedCourse.id) ? (
                <a
                  href={`/courses/${selectedCourse.id}`}
                  className="h-10 px-6 inline-flex items-center justify-center rounded-xl text-xs font-bold text-white shadow-md cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Enter Workspace
                </a>
              ) : (
                <a
                  href={isLoggedIn ? "#" : "/admission/apply"}
                  onClick={(e) => {
                    if (isLoggedIn) {
                      e.preventDefault();
                      alert("You are already signed in. Please contact an admin to enroll in this batch course.");
                    }
                  }}
                  className={`h-10 px-6 inline-flex items-center justify-center rounded-xl text-xs font-bold text-white shadow-md ${
                    isLoggedIn ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground" : "hover:opacity-90 cursor-pointer"
                  }`}
                  style={{ backgroundColor: isLoggedIn ? undefined : primaryColor }}
                >
                  {isLoggedIn ? "Apply Disabled" : "Apply & Buy"}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
