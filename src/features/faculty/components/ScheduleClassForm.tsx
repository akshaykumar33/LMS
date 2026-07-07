"use client";

import React, { useState } from "react";
import { scheduleLiveClassAction } from "../actions/faculty-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CourseWithModules {
  id: string;
  name: string;
  code: string;
  modules: {
    id: string;
    name: string;
  }[];
}

interface ScheduleClassFormProps {
  courses: CourseWithModules[];
  userRole?: string;
}

export function ScheduleClassForm({ courses, userRole }: ScheduleClassFormProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [zoomMeetingId, setZoomMeetingId] = useState("");
  const [zoomPasscode, setZoomPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const modulesList = selectedCourse?.modules || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId || !title || !zoomMeetingId || !zoomPasscode) {
      setMessage({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await scheduleLiveClassAction({
        moduleId: selectedModuleId,
        title,
        zoomMeetingId,
        zoomPasscode,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Live class scheduled successfully! Refreshing page..." });
        setTitle("");
        setZoomMeetingId("");
        setZoomPasscode("");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setMessage({ type: "error", text: res.error || "Failed to schedule class." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 space-y-5 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">🎥 Schedule Live Zoom Session</h3>
          <p className="text-[11px] text-muted-foreground">
            Instantly spin up online video lectures and synchronize calendar notifications.
          </p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-xs font-semibold ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {message.text}
          </div>
        )}

        {/* Select Course */}
        <div className="space-y-1.5">
          <Label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Course *</Label>
          <Select
            value={selectedCourseId}
            onValueChange={(val) => {
              setSelectedCourseId(val);
              setSelectedModuleId("");
            }}
          >
            <SelectTrigger className="w-full h-10 text-xs bg-transparent border-input focus:ring-1">
              <SelectValue placeholder="-- Choose Course --" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  [{c.code}] {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Select Module */}
        <div className="space-y-1.5">
          <Label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Module *</Label>
          <Select
            value={selectedModuleId}
            onValueChange={setSelectedModuleId}
            disabled={!selectedCourseId}
          >
            <SelectTrigger className="w-full h-10 text-xs bg-transparent border-input focus:ring-1">
              <SelectValue placeholder="-- Choose Module --" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              {modulesList.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Session Title *</Label>
          <Input
            type="text"
            placeholder="e.g. EUV Tin Plasma Deep-Dive Q&A"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 text-xs bg-transparent border-input focus:border-primary/50"
            required
          />
        </div>

        {/* Zoom Credentials */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Meeting ID *</Label>
            <Input
              type="text"
              placeholder="821 7401 9283"
              value={zoomMeetingId}
              onChange={(e) => setZoomMeetingId(e.target.value)}
              className="h-10 text-xs bg-transparent border-input focus:border-primary/50"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Passcode *</Label>
            <Input
              type="text"
              placeholder="Passcode123"
              value={zoomPasscode}
              onChange={(e) => setZoomPasscode(e.target.value)}
              className="h-10 text-xs bg-transparent border-input focus:border-primary/50"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || userRole === "Guest"}
          className="w-full h-10 text-xs font-bold shadow-md cursor-pointer mt-2"
        >
          {loading ? "Scheduling..." : userRole === "Guest" ? "Read Only" : "Schedule Live Class"}
        </Button>
      </form>
    </div>
  );
}
