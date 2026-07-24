"use client";

import React, { useEffect, useRef } from "react";
import { useCourseManagerStore } from "@/store";
import { updateCourseAction, updateModuleAction, updateLessonAction, updateCapstoneProjectAction } from "../actions/course-actions";
import { getPresignedUrlAction } from "@/features/admission/actions/admission-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CourseManagerConsoleProps {
  initialCourses: any[];
  primaryColor?: string;
  userRole?: string;
  enableCapstone?: boolean;
}

function cleanModuleName(name: string): string {
  return name.replace(/^module\s+\d+[\s:-]*/i, "").trim();
}

export function CourseManagerConsole({
  initialCourses,
  primaryColor = "#0284c7",
  userRole,
  enableCapstone = true,
}: CourseManagerConsoleProps) {
  const {
    courses, setCourses,
    selectedCourse, setSelectedCourse, updateCourseInList,
    editingCourse, openEditCourse, patchEditingCourse, closeEditCourse,
    editingModule, openEditModule, patchEditingModule, closeEditModule,
    editingLesson, openEditLesson, patchEditingLesson, closeEditLesson,
    editingCapstone, openEditCapstone, patchEditingCapstone, closeEditCapstone,
    closeAllEditors,
    isSubmitting, setIsSubmitting,
    feedback, showFeedback,
    scormUploading, setScormUploading,
    courseScormUploading, setCourseScormUploading,
  } = useCourseManagerStore();

  // Seed store from server props on first mount
  useEffect(() => {
    setCourses(initialCourses);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scormFileRef = useRef<HTMLInputElement>(null);
  const courseScormFileRef = useRef<HTMLInputElement>(null);

  // ── Upload handlers ────────────────────────────────────────────────────────
  const handleScormZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingLesson) return;
    setScormUploading(true);
    try {
      const res = await getPresignedUrlAction(file.name, "application/zip");
      if (!res.success || !res.uploadUrl) throw new Error(res.error || "Failed to get upload URL.");
      const uploadRes = await fetch(res.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": "application/zip" } });
      if (!uploadRes.ok) throw new Error("Upload failed.");
      const uploadJson = await uploadRes.json();
      const launchUrl = uploadJson?.url || res.fileUrl;
      patchEditingLesson({ fileUrl: launchUrl });
      showFeedback(`SCORM package "${file.name}" extracted and ready.`);
    } catch (err: any) {
      showFeedback(err.message || "SCORM upload failed.", "error");
    } finally {
      setScormUploading(false);
    }
  };

  const handleCourseScormZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCourse) return;
    setCourseScormUploading(true);
    try {
      const res = await getPresignedUrlAction(file.name, "application/zip");
      if (!res.success || !res.uploadUrl) throw new Error(res.error || "Failed to get upload URL.");
      const uploadRes = await fetch(res.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": "application/zip" } });
      if (!uploadRes.ok) throw new Error("Upload failed.");
      const uploadJson = await uploadRes.json();
      const launchUrl = uploadJson?.url || res.fileUrl;
      patchEditingCourse({ scormPackageUrl: launchUrl });
      showFeedback(`SCORM package "${file.name}" extracted and ready.`);
    } catch (err: any) {
      showFeedback(err.message || "SCORM upload failed.", "error");
    } finally {
      setCourseScormUploading(false);
    }
  };

  // ── Submit handlers ────────────────────────────────────────────────────────
  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setIsSubmitting(true);
    const res = await updateCourseAction(editingCourse.id, {
      name: editingCourse.name,
      code: editingCourse.code,
      description: editingCourse.description || "",
      scormEnabled: editingCourse.scormEnabled || false,
      scormPackageUrl: editingCourse.scormPackageUrl || null,
    });
    setIsSubmitting(false);
    if (res.success) {
      updateCourseInList(editingCourse);
      closeEditCourse();
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
      const updatedModules = selectedCourse.modules.map((m: any) =>
        m.id === editingModule.id ? { ...m, ...editingModule } : m
      );
      updateCourseInList({ ...selectedCourse, modules: updatedModules });
      closeEditModule();
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
      contentType: editingLesson.contentType,
    });
    setIsSubmitting(false);
    if (res.success) {
      const updatedModules = selectedCourse.modules.map((m: any) => ({
        ...m,
        lessons: m.lessons.map((l: any) =>
          l.id === editingLesson.id ? { ...l, ...editingLesson } : l
        ),
      }));
      updateCourseInList({ ...selectedCourse, modules: updatedModules });
      closeEditLesson();
      showFeedback("Lesson & transcript updated successfully.");
    } else {
      showFeedback(res.error || "Failed to update lesson.", "error");
    }
  };

  const handleUpdateCapstone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCapstone || !selectedCourse) return;
    setIsSubmitting(true);
    const res = await updateCapstoneProjectAction(selectedCourse.id, {
      title: editingCapstone.title,
      description: editingCapstone.description || "",
      difficulty: editingCapstone.difficulty || "Intermediate",
      durationWeeks: Number(editingCapstone.durationWeeks) || 4,
    });
    setIsSubmitting(false);
    if (res.success) {
      updateCourseInList({ ...selectedCourse, capstoneProject: { ...selectedCourse.capstoneProject, ...editingCapstone } });
      closeEditCapstone();
      showFeedback("Capstone project updated successfully.");
    } else {
      showFeedback(res.error || "Failed to update capstone project.", "error");
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
              <Badge variant="outline" className="text-[10px] font-mono" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}40` }}>
                CMS Mode
              </Badge>
            </div>

            {feedback && (
              <div className={`p-3 rounded-lg text-xs font-bold ${feedback.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
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
                    onClick={() => { setSelectedCourse(c); closeAllEditors(); }}
                    className={`w-full text-left justify-start h-auto p-4 rounded-xl border flex flex-col items-start gap-2 ${isSel ? "bg-secondary/80" : "border-border hover:border-muted-foreground/30 bg-transparent"}`}
                    style={{ borderColor: isSel ? primaryColor : undefined }}
                  >
                    <div className="flex justify-between items-center w-full">
                      <Badge variant="outline" className="text-[10px] font-bold" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}40` }}>{c.code}</Badge>
                      <span className="text-[10px] text-muted-foreground">{c.modules.length} Modules</span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground truncate w-full text-left">{c.name}</h3>
                    {c.tenantName && (
                      <span className="text-[9px] text-muted-foreground/80 font-bold bg-secondary/40 px-1.5 py-0.5 rounded-md border border-border/40 mt-1">🏢 {c.tenantName}</span>
                    )}
                  </Button>
                );
              })}
              {courses.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No courses created yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Syllabus Management Panel */}
      <div className="lg:col-span-8 space-y-6">
        {selectedCourse ? (
          <Card className="border-border">
            <CardContent className="p-6 space-y-8">
              <div className="flex justify-between items-start border-b border-border pb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-bold" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}40` }}>{selectedCourse.code}</Badge>
                    <h2 className="text-xl font-extrabold text-foreground">{selectedCourse.name}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">{selectedCourse.description || "No description provided."}</p>
                </div>
                <Button size="sm" variant="outline" disabled={userRole === "Guest"} onClick={() => openEditCourse(selectedCourse)} className="text-xs font-bold border" style={{ borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}0c`, color: primaryColor }}>
                  {userRole === "Guest" ? "Read Only" : "Edit Details"}
                </Button>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Syllabus Structure</h3>
                <div className="space-y-4">
                  {selectedCourse.modules.map((mod: any, mIdx: number) => (
                    <div key={mod.id} className="border border-border/80 p-4 rounded-xl space-y-4 bg-muted/5">
                      <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <h4 className="text-sm font-extrabold text-foreground">Module {mIdx + 1}: {cleanModuleName(mod.name)}</h4>
                        <Button variant="link" disabled={userRole === "Guest"} onClick={() => openEditModule(mod)} className="text-[11px] h-auto p-0" style={{ color: primaryColor }}>Rename Module</Button>
                      </div>
                      <div className="space-y-2">
                        {mod.lessons.map((les: any) => (
                          <div key={les.id} className="flex justify-between items-center p-3 bg-muted/10 border border-border/60 rounded-lg hover:border-muted-foreground/30 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-foreground font-bold">📄 {les.title}</span>
                                <Badge variant="secondary" className="text-[9px] font-bold font-mono uppercase px-1.5 h-4">{les.contentType}</Badge>
                              </div>
                              {les.videoUrl && <p className="text-[10px] text-muted-foreground">📹 Video: <code style={{ color: primaryColor }}>{les.videoUrl}</code></p>}
                            </div>
                            <Button variant="ghost" size="sm" disabled={userRole === "Guest"} onClick={() => openEditLesson(les)} className="text-xs font-semibold text-muted-foreground transition-colors" onMouseEnter={(e) => { e.currentTarget.style.color = primaryColor; }} onMouseLeave={(e) => { e.currentTarget.style.color = ""; }}>
                              Configure Transcript &rarr;
                            </Button>
                          </div>
                        ))}
                        {mod.lessons.length === 0 && <p className="text-xs text-muted-foreground italic">No lessons inside this module.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-12 text-center text-muted-foreground">Select a course to inspect its modules and content structure.</CardContent>
          </Card>
        )}
      </div>

      {/* ── Edit Course Modal ─────────────────────────────────────────────── */}
      {editingCourse && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateCourse} className="bg-slate-950 border border-border p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground">Edit Course Properties</h3>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Course Code</Label>
              <Input type="text" required value={editingCourse.code} onChange={(e) => patchEditingCourse({ code: e.target.value })} className="h-10 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Course Name</Label>
              <Input type="text" required value={editingCourse.name} onChange={(e) => patchEditingCourse({ name: e.target.value })} className="h-10 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase">Description</Label>
              <textarea value={editingCourse.description || ""} onChange={(e) => patchEditingCourse({ description: e.target.value })} className="w-full h-24 bg-transparent border border-input rounded-lg p-2.5 text-xs text-white resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none" />
            </div>
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground">Deliver via SCORM Package</Label>
                  <p className="text-[10px] text-muted-foreground">Bypasses curriculum roadmap lessons with a single SCORM zip.</p>
                </div>
                <input type="checkbox" checked={editingCourse.scormEnabled || false} onChange={(e) => patchEditingCourse({ scormEnabled: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
              </div>
              {editingCourse.scormEnabled && (
                <div className="space-y-2 bg-slate-900/50 p-3 rounded-xl border border-border/50">
                  <Label className="text-[10px] text-slate-400 font-bold uppercase block">SCORM Zip Package (.zip)</Label>
                  <div className="flex gap-2">
                    <Input type="text" value={editingCourse.scormPackageUrl || ""} placeholder="Upload SCORM zip below" readOnly className="h-9 text-[10px] flex-1 bg-slate-950 border-border" />
                    <input type="file" ref={courseScormFileRef} accept=".zip" onChange={handleCourseScormZipUpload} className="hidden" />
                    <Button type="button" disabled={courseScormUploading} onClick={() => courseScormFileRef.current?.click()} className="h-9 px-3 text-[10px] font-bold shrink-0 bg-sky-600 hover:bg-sky-500 text-white">
                      {courseScormUploading ? "Extracting…" : "Upload Zip"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeEditCourse} className="text-xs font-bold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs font-bold" style={{ backgroundColor: primaryColor, color: "#fff" }}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Module Modal ─────────────────────────────────────────────── */}
      {editingModule && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateModule} className="bg-slate-950 border border-border p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground">Edit Module Properties</h3>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Module Title</Label>
              <Input type="text" required value={editingModule.name} onChange={(e) => patchEditingModule({ name: e.target.value })} className="h-10 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400 font-bold uppercase">Description</Label>
              <textarea value={editingModule.description || ""} onChange={(e) => patchEditingModule({ description: e.target.value })} className="w-full h-24 bg-transparent border border-input rounded-lg p-2.5 text-xs text-white resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeEditModule} className="text-xs font-bold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs font-bold" style={{ backgroundColor: primaryColor, color: "#fff" }}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Lesson Modal ─────────────────────────────────────────────── */}
      {editingLesson && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateLesson} className="bg-popover border border-border p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground">Configure Lesson & Resources</h3>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Lesson Title</Label>
              <Input type="text" required value={editingLesson.title} onChange={(e) => patchEditingLesson({ title: e.target.value })} className="h-10 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Content Type</Label>
              <select value={editingLesson.contentType} onChange={(e) => patchEditingLesson({ contentType: e.target.value })} className="w-full h-10 bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="video" className="bg-card text-foreground">Video Lesson</option>
                <option value="text" className="bg-card text-foreground">Text / Notes / PDF</option>
                <option value="live_class" className="bg-card text-foreground">Live Class / Zoom</option>
                <option value="audio" className="bg-card text-foreground">Audio Lecture</option>
                <option value="excel" className="bg-card text-foreground">Interactive Spreadsheet (Excel)</option>
                <option value="scorm" className="bg-card text-foreground">Interactive SCORM Package</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Video URL (Optional)</Label>
              <Input type="url" value={editingLesson.videoUrl || ""} placeholder="https://youtube.com/..." onChange={(e) => patchEditingLesson({ videoUrl: e.target.value })} className="h-10 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">
                {editingLesson.contentType === "scorm" ? "SCORM Launch URL" : "Worksheet PDF / Document URL (Optional)"}
              </Label>
              <div className="flex gap-2">
                <Input type={editingLesson.contentType === "scorm" ? "text" : "url"} value={editingLesson.fileUrl || ""} placeholder={editingLesson.contentType === "scorm" ? "Upload a SCORM zip below or paste a launch URL" : "https://example.com/handout.pdf"} onChange={(e) => patchEditingLesson({ fileUrl: e.target.value })} readOnly={editingLesson.contentType === "scorm"} className="h-10 text-xs flex-1" />
                {editingLesson.contentType === "scorm" && (
                  <>
                    <input type="file" ref={scormFileRef} accept=".zip" onChange={handleScormZipUpload} className="hidden" />
                    <Button type="button" disabled={scormUploading} onClick={() => scormFileRef.current?.click()} className="h-10 px-3 text-xs font-bold shrink-0">
                      {scormUploading ? "Extracting…" : "Upload .zip"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-bold uppercase">Transcript / Core Text Notes</Label>
              <textarea value={editingLesson.content || ""} placeholder="Add lecture transcripts, code snippets, or notes..." onChange={(e) => patchEditingLesson({ content: e.target.value })} className="w-full h-40 bg-transparent border border-input rounded-lg p-2.5 text-xs text-foreground resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeEditLesson} className="text-xs font-bold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs font-bold" style={{ backgroundColor: primaryColor, color: "#fff" }}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
