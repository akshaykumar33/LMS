"use client";

import React, { useState, useEffect } from "react";
import { updateLessonAction } from "@/features/course/actions/course-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Lesson {
  id: string;
  title: string;
  contentType: string;
  content: string | null;
  videoUrl: string | null;
  zoomMeetingId?: string | null;
  zoomPasscode?: string | null;
}

interface Module {
  id: string;
  name: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  code: string;
  name: string;
  modules: Module[];
}

interface FacultyQuickConfigFormProps {
  courses: Course[];
  primaryColor?: string;
}

export function FacultyQuickConfigForm({ courses, primaryColor = "#0284c7" }: FacultyQuickConfigFormProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");

  const [lessonTitle, setLessonTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [zoomMeetingId, setZoomMeetingId] = useState("");
  const [zoomPasscode, setZoomPasscode] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeCourse = courses.find((c) => c.id === selectedCourseId);
  const activeModule = activeCourse?.modules.find((m) => m.id === selectedModuleId);
  const activeLesson = activeModule?.lessons.find((l) => l.id === selectedLessonId);

  // Reset module and lesson selectors when course changes
  useEffect(() => {
    if (activeCourse && activeCourse.modules.length > 0) {
      setSelectedModuleId(activeCourse.modules[0].id);
    } else {
      setSelectedModuleId("");
      setSelectedLessonId("");
    }
  }, [selectedCourseId]);

  // Reset lesson selector when module changes
  useEffect(() => {
    if (activeModule && activeModule.lessons.length > 0) {
      setSelectedLessonId(activeModule.lessons[0].id);
    } else {
      setSelectedLessonId("");
    }
  }, [selectedModuleId]);

  // Populate fields when lesson is selected
  useEffect(() => {
    if (activeLesson) {
      setLessonTitle(activeLesson.title);
      setVideoUrl(activeLesson.videoUrl || "");
      setContent(activeLesson.content || "");
      setZoomMeetingId(activeLesson.zoomMeetingId || "");
      setZoomPasscode(activeLesson.zoomPasscode || "");
    } else {
      setLessonTitle("");
      setVideoUrl("");
      setContent("");
      setZoomMeetingId("");
      setZoomPasscode("");
    }
  }, [selectedLessonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) return;

    setLoading(true);
    setMessage(null);

    const res = await updateLessonAction(selectedLessonId, {
      title: lessonTitle,
      content,
      videoUrl,
      zoomMeetingId,
      zoomPasscode,
    });

    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: "Lesson contents and Zoom resources updated. Refreshing page..." });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to save details." });
    }
  };

  return (
    <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-6 space-y-5">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">Lesson Resource & Schedule Editor</h3>
        <p className="text-[11px] text-muted-foreground">
          Upload transcripts, attach stream links, reschedule classes, and set Zoom credentials.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dropdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Select Course</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-full h-10 text-xs bg-transparent border-input">
                <SelectValue placeholder="-- Choose Course --" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Select Module</Label>
            <Select
              value={selectedModuleId}
              onValueChange={setSelectedModuleId}
              disabled={!selectedCourseId}
            >
              <SelectTrigger className="w-full h-10 text-xs bg-transparent border-input">
                <SelectValue placeholder="-- Choose Module --" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {activeCourse?.modules.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Select Lesson</Label>
            <Select
              value={selectedLessonId}
              onValueChange={setSelectedLessonId}
              disabled={!selectedModuleId}
            >
              <SelectTrigger className="w-full h-10 text-xs bg-transparent border-input">
                <SelectValue placeholder="-- Choose Lesson --" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {activeModule?.lessons.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">
                    {l.title} ({l.contentType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedLessonId && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Lesson Title</Label>
              <Input
                type="text"
                required
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="h-10 text-xs bg-transparent border-input focus:border-primary/50"
              />
            </div>

            {activeLesson?.contentType === "video" && (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Video URL</Label>
                <Input
                  type="url"
                  required
                  value={videoUrl}
                  placeholder="https://youtube.com/watch?v=..."
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="h-10 text-xs bg-transparent border-input focus:border-primary/50"
                />
              </div>
            )}

            {activeLesson?.contentType === "live_class" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Zoom Meeting ID</Label>
                  <Input
                    type="text"
                    required
                    value={zoomMeetingId}
                    onChange={(e) => setZoomMeetingId(e.target.value)}
                    className="h-10 text-xs bg-transparent border-input focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Zoom Passcode</Label>
                  <Input
                    type="text"
                    required
                    value={zoomPasscode}
                    onChange={(e) => setZoomPasscode(e.target.value)}
                    className="h-10 text-xs bg-transparent border-input focus:border-primary/50"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                Transcript Notes / Reference Text
              </Label>
              <textarea
                value={content}
                rows={4}
                placeholder="Write lecture summary transcripts or reference information..."
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-transparent border border-input rounded-lg p-2.5 text-xs text-foreground resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="text-xs font-bold px-5 h-10 rounded-xl transition-all shadow-md cursor-pointer neon-btn-primary"
                style={{ backgroundColor: primaryColor, color: "#fff" }}
              >
                {loading ? "Saving Changes..." : "Save Resources"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
