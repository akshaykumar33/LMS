"use client";

import React, { useState, useEffect, useRef } from "react";
import { updateLessonAction } from "@/features/course/actions/course-actions";
import { getPresignedUrlAction } from "@/features/admission/actions/admission-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileText, Film, Volume2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  contentType: string;
  content: string | null;
  videoUrl: string | null;
  fileUrl?: string | null;
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
  courses: any[];
  primaryColor?: string;
  userRole?: string;
}

export function FacultyQuickConfigForm({ courses, primaryColor = "#0ea5e9", userRole }: FacultyQuickConfigFormProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");

  const [lessonTitle, setLessonTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [zoomMeetingId, setZoomMeetingId] = useState("");
  const [zoomPasscode, setZoomPasscode] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("text");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scormInputRef = useRef<HTMLInputElement>(null);

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
      setFileUrl(activeLesson.fileUrl || "");
      setContent(activeLesson.content || "");
      setZoomMeetingId(activeLesson.zoomMeetingId || "");
      setZoomPasscode(activeLesson.zoomPasscode || "");
      setContentType(activeLesson.contentType || "text");
    } else {
      setLessonTitle("");
      setVideoUrl("");
      setFileUrl("");
      setContent("");
      setZoomMeetingId("");
      setZoomPasscode("");
      setContentType("text");
    }
  }, [selectedLessonId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "video" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const res = await getPresignedUrlAction(file.name, file.type);
      if (!res.success || !res.uploadUrl || !res.fileUrl) {
        throw new Error(res.error || "Failed to generate upload URL.");
      }

      const uploadRes = await fetch(res.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage.");
      }

      if (targetField === "video") {
        setVideoUrl(res.fileUrl);
      } else {
        setFileUrl(res.fileUrl);
      }
      setMessage({ type: "success", text: `Uploaded "${file.name}" successfully!` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  };

  const handleScormUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const res = await getPresignedUrlAction(file.name, "application/zip");
      if (!res.success || !res.uploadUrl || !res.fileUrl) {
        throw new Error(res.error || "Failed to generate upload URL.");
      }

      const uploadRes = await fetch(res.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/zip" },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload SCORM package.");
      }

      // The mock-upload route returns the extracted launch URL for zips
      const uploadJson = await uploadRes.json();
      const launchUrl = uploadJson?.url || res.fileUrl;
      setFileUrl(launchUrl);
      setMessage({ type: "success", text: `SCORM package "${file.name}" extracted and ready.` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "SCORM upload failed." });
    } finally {
      setUploading(false);
    }
  };

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
      fileUrl,
      contentType,
    });

    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: "Lesson contents and resources updated. Refreshing page..." });
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
          Upload media formats (sheets, PDFs, audio, video), attach stream links, reschedule classes, and set Zoom credentials.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            message.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
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
                {activeCourse?.modules.map((m: any) => (
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
                {activeModule?.lessons.map((l: any) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">
                    {l.title} ({l.contentType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedLessonId && (
          <div className="space-y-4 border-t border-border pt-4">
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

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Lesson Content Type</Label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full h-10 bg-card border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50"
              >
                <option value="video" className="bg-card text-foreground">Video Lesson</option>
                <option value="text" className="bg-card text-foreground">Text / Notes / PDF</option>
                <option value="live_class" className="bg-card text-foreground">Live Class / Zoom</option>
                <option value="audio" className="bg-card text-foreground">Audio Lecture</option>
                <option value="excel" className="bg-card text-foreground">Interactive Spreadsheet (Excel)</option>
                <option value="scorm" className="bg-card text-foreground">Interactive SCORM Package</option>
              </select>
            </div>

            {(contentType === "video" || contentType === "audio") && (
              <div className="space-y-3 bg-secondary/15 p-4 rounded-xl border border-border/60">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                  {contentType === "audio" ? "Audio Source (Link or Direct Upload)" : "Video Source (Link or Direct Upload)"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={videoUrl}
                    placeholder={contentType === "audio" ? "Paste external audio link (mp3, wav, direct stream)..." : "Paste external video link (e.g. YouTube, Vimeo, direct mp4)..."}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="h-10 text-xs bg-transparent border-input focus:border-primary/50 flex-1"
                  />
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept={contentType === "audio" ? "audio/*" : "video/*"}
                    onChange={(e) => handleFileUpload(e, "video")}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    disabled={uploading}
                    onClick={() => videoInputRef.current?.click()}
                    className="h-10 px-4 text-xs font-bold shrink-0 border border-border bg-card/50 hover:bg-secondary text-foreground flex items-center gap-1.5 cursor-pointer"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : contentType === "audio" ? <Volume2 className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                    Upload File
                  </Button>
                </div>
              </div>
            )}

            {contentType === "live_class" && (
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

            {/* SCORM Package Upload */}
            {contentType === "scorm" && (
              <div className="space-y-3 bg-secondary/15 p-4 rounded-xl border border-border/60">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                  SCORM Package (.zip)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={fileUrl}
                    placeholder="No SCORM package uploaded yet."
                    readOnly
                    className="h-10 text-xs bg-transparent border-input flex-1 cursor-default"
                  />
                  <input
                    type="file"
                    ref={scormInputRef}
                    accept=".zip"
                    onChange={handleScormUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    disabled={uploading}
                    onClick={() => scormInputRef.current?.click()}
                    className="h-10 px-4 text-xs font-bold shrink-0 border border-border bg-card/50 hover:bg-secondary text-foreground flex items-center gap-1.5 cursor-pointer"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    Upload SCORM ZIP
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Upload a SCORM 1.2 or 2004 package. The system will extract it and locate the launch file automatically.
                </p>
              </div>
            )}

            {/* General Worksheet / PDF / Audio attachment */}
            <div className="space-y-3 bg-secondary/15 p-4 rounded-xl border border-border/60">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                Lesson Media Attachment (Sheets, PDFs, Audio, Worksheets)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={fileUrl}
                  placeholder="No media file attached yet."
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="h-10 text-xs bg-transparent border-input focus:border-primary/50 flex-1"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.xls,.xlsx,.csv,.mp3,.wav,.ogg,.pdf,.zip,.doc,.docx"
                  onChange={(e) => handleFileUpload(e, "file")}
                  className="hidden"
                />
                <Button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 px-4 text-xs font-bold shrink-0 border border-border bg-card/50 hover:bg-secondary text-foreground flex items-center gap-1.5 cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  Attach File
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Supports spreadsheet templates, lesson instructions, and media files. Students can download with institutional watermarks.
              </p>
            </div>

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
                disabled={loading || uploading || userRole === "Guest"}
                className="text-xs font-bold px-5 h-10 rounded-xl transition-all shadow-md cursor-pointer neon-btn-primary"
                style={{ backgroundColor: primaryColor, color: "#fff" }}
              >
                {loading ? "Saving Changes..." : userRole === "Guest" ? "Read Only" : "Save Resources"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
