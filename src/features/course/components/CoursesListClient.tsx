"use client";

import React from "react";
import {
  BookOpen,
  ChevronRight,
  Layers,
  FileText,
  GraduationCap,
  Sparkles,
  Search,
  PlusCircle,
} from "lucide-react";
import { enrollStudentInElectiveAction } from "../actions/course-actions";

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
  allAvailableCourses: CourseItem[];
  batchName: string;
  primaryColor: string;
}

export function CoursesListClient({
  courses,
  allAvailableCourses = [],
  batchName,
  primaryColor,
}: CoursesListClientProps) {
  const [activeTab, setActiveTab] = React.useState<"cohort" | "catalog">("cohort");
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter electives: available courses that student is not currently enrolled in
  const electiveCourses = allAvailableCourses.filter(
    (available) => !courses.some((enrolled) => enrolled.id === available.id)
  );

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const res = await enrollStudentInElectiveAction(courseId);
      if (res.success) {
        setNotification({
          type: "success",
          message: "Self-enrollment successful! Elective course added to your active curriculum.",
        });
      } else {
        setNotification({
          type: "error",
          message: res.error || "Enrollment failed. Please try again.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setEnrollingId(null);
      // Auto-dismiss notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const currentList = activeTab === "cohort" ? courses : electiveCourses;

  const filteredList = currentList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border rounded-3xl p-6 lg:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
            Active Curriculum
          </span>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground">
            {activeTab === "cohort" ? "Your Cohort Courses" : "Explore Elective Catalog"}
          </h1>
          <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
            {activeTab === "cohort" ? (
              <>
                All courses assigned to your cohort{" "}
                <strong className="text-foreground">{batchName}</strong>. Select any course to enter the workspace.
              </>
            ) : (
              "Browse and self-enroll in additional micro-credential and specialization courses offered in semiconductor science."
            )}
          </p>
        </div>
      </div>

      {/* Tabs & Search controls */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-border pb-4">
        {/* Tab Buttons */}
        <div className="flex bg-secondary/50 p-1.5 rounded-xl border border-border/60 self-start">
          <button
            onClick={() => {
              setActiveTab("cohort");
              setSearchQuery("");
            }}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
              activeTab === "cohort"
                ? "bg-card text-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Cohort Courses ({courses.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("catalog");
              setSearchQuery("");
            }}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
              activeTab === "catalog"
                ? "bg-card text-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Elective Catalog ({electiveCourses.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border hover:border-border/80 focus:border-primary/60 focus:ring-1 focus:ring-primary/60 outline-none rounded-xl text-xs font-semibold transition-all text-foreground"
          />
        </div>
      </div>

      {/* Success/Error Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border animate-in slide-in-from-top duration-300 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Courses Grid */}
      {filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredList.map((course, idx) => {
            // Simulated progress for enrolled courses, or 0% for electives
            const simulatedProgress =
              activeTab === "cohort" ? Math.min(95, Math.max(5, ((idx * 37 + 15) % 80) + 10)) : 0;
            return (
              <div
                key={course.id}
                className="group bg-card border border-border hover:border-primary/40 rounded-2xl overflow-hidden transition-all hover:shadow-xl relative flex flex-col justify-between"
              >
                <div>
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

                    {/* Progress bar (Enrolled Only) */}
                    {activeTab === "cohort" && (
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
                    )}

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
                  </div>
                </div>

                <div className="p-6 pt-0">
                  {/* Action Button */}
                  {activeTab === "cohort" ? (
                    <a
                      href={`/courses/${course.id}`}
                      className="w-full h-10 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg hover:scale-[1.01] cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Enter Workspace <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrollingId !== null}
                      className="w-full h-10 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {enrollingId === course.id ? (
                        "Enrolling..."
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" /> Self-Enroll in Course
                        </>
                      )}
                    </button>
                  )}
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
              {searchQuery ? "No Courses Found" : "No Courses Available"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              {searchQuery
                ? "Try adjusting your keywords or clearing the search query to find courses."
                : activeTab === "cohort"
                ? "Your cohort curriculum hasn't been published yet. Check back soon or contact your program coordinator."
                : "All available courses are already added to your cohort curriculum."}
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
