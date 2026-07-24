CREATE TABLE IF NOT EXISTS "subjective_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_id" uuid,
	"student_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"question_text" text NOT NULL,
	"student_answer" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"score" integer,
	"rubrics" jsonb,
	"feedback" text,
	"evaluated_by" uuid,
	"evaluated_at" timestamp with time zone,
	"history" jsonb,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
