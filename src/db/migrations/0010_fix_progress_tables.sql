ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "scorm_data" jsonb;
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "video_resume_offset_seconds" integer DEFAULT 0;
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "video_max_watched_percent" integer DEFAULT 0;
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "total_time_spent_seconds" integer DEFAULT 0;
ALTER TABLE "lesson_progress" ADD COLUMN IF NOT EXISTS "zoom_attendance_logs" jsonb;

CREATE TABLE IF NOT EXISTS "course_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"last_visited_lesson_id" uuid,
	"completed" boolean DEFAULT false NOT NULL,
	"scorm_data" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
