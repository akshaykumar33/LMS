"use client";

import React, { useState } from "react";
import { updateCourseAction, updateModuleAction, updateLessonAction } from "../actions/course-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Lesson {
  id: string;
  title: string;
  contentType: string;
  content: string | null;
  videoUrl: string | null;
  fileUrl?: string | null;
  order: number;
}

interface Module {
  id: string;
  name: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  modules: Module[];
}

interface CourseManagerConsoleProps {
  initialCourses: Course[];
  primaryColor?: string;
}

function cleanModuleName(name: string): string {
  return name.replace(/^module\s+\d+[\s:-]*/i, "").trim();
}

export function CourseManagerConsole({ initialCourses, primaryColor = "#0284c7" }: CourseManagerConsoleProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(initialCourses[0] || null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setIsSubmitting(true);
    const res = await updateCourseAction(editingCourse.id, {
      name: editingCourse.name,
      code: editingCourse.code,
      description: editingCourse.description || "",
    });
    setIsSubmitting(false);

    if (res.success) {
      setCourses(courses.map(c => c.id === editingCourse.id ? { ...c, ...editingCourse } : c));
      setSelectedCourse(editingCourse);
      setEditingCourse(null);
      showFeedback("Course details updated successfully.");
    } else {
      showFeedback(res.error || "Failed to update course.", "error");
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !selectedCourse) return;
    setIsSubmitting(true);
    const res = await updateModuleAction(editingModule.id, {
      name: editingModule.name,
      description: editingModule.description || "",
    });
    setIsSubmitting(false);

    if (res.success) {
      const updatedModules = selectedCourse.modules.map(m => m.id === editingModule.id ? { ...m, ...editingModule } : m);
      const updatedCourse = { ...selectedCourse, modules: updatedModules };
      setCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
      setSelectedCourse(updatedCourse);
      setEditingModule(null);
      showFeedback("Module updated successfully.");
    } else {
      showFeedback(res.error || "Failed to update module.", "error");
    }
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !selectedCourse) return;
    setIsSubmitting(true);
    const res = await updateLessonAction(editingLesson.id, {
      title: editingLesson.title,
      content: editingLesson.content || "",
      videoUrl: editingLesson.videoUrl || "",
      fileUrl: editingLesson.fileUrl || "",
    });
    setIsSubmitting(false);

    if (res.success) {
      const updatedModules = selectedCourse.modules.map(m => {
        const updatedLessons = m.lessons.map(l => l.id === editingLesson.id ? { ...l, ...editingLesson } : l);
        return { ...m, lessons: updatedLessons };
      });
      const updatedCourse = { ...selectedCourse, modules: updatedModules };
      setCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
      setSelectedCourse(updatedCourse);
      setEditingLesson(null);
      showFeedback("Lesson & transcript updated successfully.");
    } else {
      showFeedback(res.error || "Failed to update lesson.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-foreground font-sans">
      {/* Course List Panel */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-border">
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground">Course Catalog</h2>
              <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-400 font-mono border-sky-500/25">
                CMS Mode
              </Badge>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs font-bold ${
                  feedback.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="space-y-2">
              {courses.map((c) => {
                const isSel = selectedCourse?.id === c.id;
                return (
                  <Button
                    key={c.id}
                    variant={isSel ? "secondary" : "ghost"}
                    onClick={() => {
                      setSelectedCourse(c);
                      setEditingCourse(null);
                      setEditingModule(null);
                      setEditingLesson(null);
                    }}
                    className={`w-full text-left justify-start h-auto p-4 rounded-xl border flex flex-col items-start gap-2 ${
                      isSel ? "border-primary/50 bg-secondary/80" : "border-border hover:border-muted-foreground/30 bg-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <Badge variant="outline" className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border-sky-500/25">
                        {c.code}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {c.modules.length} Modules
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground truncate w-full text-left">{c.name}</h3>
                  </Button>
                );
              })}
              {courses.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No courses created yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Syllabus Management Panel */}
      <div className="lg:col-span-8 space-y-6">
        {selectedCourse ? (
          <Card className="border-border">
            <CardContent className="p-6 space-y-8">
              {/* Course Details Header */}
              <div className="flex justify-between items-start border-b border-border pb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-bold text-sky-400 bg-sky-500/10 border-sky-500/25">
                      {selectedCourse.code}
                    </Badge>
                    <h2 className="text-xl font-extrabold text-foreground">{selectedCourse.name}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                    {selectedCourse.description || "No description provided."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCourse(selectedCourse);
                    setEditingModule(null);
                    setEditingLesson(null);
                  }}
                  className="text-xs font-bold border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 text-sky-400"
                >
                  Edit Details
                </Button>
              </div>

              {/* Modules list */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Syllabus Structure
                </h3>

                <div className="space-y-4">
                  {selectedCourse.modules.map((mod, mIdx) => (
                    <div key={mod.id} className="border border-border/80 p-4 rounded-xl space-y-4 bg-muted/5">
                      <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <h4 className="text-sm font-extrabold text-foreground">
                          Module {mIdx + 1}: {cleanModuleName(mod.name)}
                        </h4>
                        <Button
                          variant="link"
                          onClick={() => {
                            setEditingModule(mod);
                            setEditingCourse(null);
                            setEditingLesson(null);
                          }}
                          className="text-[11px] text-sky-500 hover:text-sky-450 h-auto p-0"
                        >
                          Rename Module
                        </Button>
                      </div>

                      {/* Lessons list */}
                      <div className="space-y-2">
                        {mod.lessons.map((les) => (
                          <div
                            key={les.id}
                            className="flex justify-between items-center p-3 bg-muted/10 border border-border/60 rounded-lg hover:border-muted-foreground/30 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-foreground font-bold">📄 {les.title}</span>
                                <Badge variant="secondary" className="text-[9px] font-bold font-mono uppercase px-1.5 h-4">
                                  {les.contentType}
                                </Badge>
                              </div>
                              {les.videoUrl && (
                                <p className="text-[10px] text-muted-foreground">
                                  📹 Video: <code className="text-sky-400">{les.videoUrl}</code>
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingLesson(les);
                                setEditingCourse(null);
                                setEditingModule(null);
                              }}
                              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                              Configure Transcript &rarr;
                            </Button>
                          </div>
                        ))}
                        {mod.lessons.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No lessons inside this module.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-12 text-center text-muted-foreground">
              Select a course to inspect its modules and content structure.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Editing Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateCourse}
            className="bg-slate-950 border border-border p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-foreground">Edit Course Properties</h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Course Code</Label>
              <Input
                type="text"
                required
                value={editingCourse.code}
                onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Course Name</Label>
              <Input
                type="text"
                required
                value={editingCourse.name}
                onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase">Description</Label>
              <textarea
                value={editingCourse.description || ""}
                onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                className="w-full h-24 bg-transparent border border-input rounded-lg p-2.5 text-xs text-white resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingCourse(null)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold"
                style={{ backgroundColor: primaryColor, color: "#fff" }}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Module Modal */}
      {editingModule && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateModule}
            className="bg-slate-950 border border-border p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-foreground">Edit Module Properties</h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Module Title</Label>
              <Input
                type="text"
                required
                value={editingModule.name}
                onChange={(e) => setEditingModule({ ...editingModule, name: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase">Description</Label>
              <textarea
                value={editingModule.description || ""}
                onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                className="w-full h-24 bg-transparent border border-input rounded-lg p-2.5 text-xs text-white resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingModule(null)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold"
                style={{ backgroundColor: primaryColor, color: "#fff" }}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Lesson Modal */}
      {editingLesson && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateLesson}
            className="bg-popover border border-border p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-foreground">Configure Lesson & Resources</h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Lesson Title</Label>
              <Input
                type="text"
                required
                value={editingLesson.title}
                onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Video URL (Optional)</Label>
              <Input
                type="url"
                value={editingLesson.videoUrl || ""}
                placeholder="https://youtube.com/... or cloudflarestream.com/..."
                onChange={(e) => setEditingLesson({ ...editingLesson, videoUrl: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Worksheet PDF / Document URL (Optional)</Label>
              <Input
                type="url"
                value={editingLesson.fileUrl || ""}
                placeholder="https://example.com/handout.pdf"
                onChange={(e) => setEditingLesson({ ...editingLesson, fileUrl: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Transcript / Core Text Notes</Label>
              <textarea
                value={editingLesson.content || ""}
                placeholder="Add lecture transcripts, code snippets, or notes..."
                onChange={(e) => setEditingLesson({ ...editingLesson, content: e.target.value })}
                className="w-full h-40 bg-transparent border border-input rounded-lg p-2.5 text-xs text-foreground resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingLesson(null)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold"
                style={{ backgroundColor: primaryColor, color: "#fff" }}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
