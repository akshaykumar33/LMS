-- Migration: 0006_ai_book_bot_context
-- Purpose: Create library_ai_contexts table for AI Book Bot document chunk storage.
-- Enables: chunked text retrieval, LLM token budget planning, future vector embedding,
--          async parse job tracking, and per-chunk lifecycle status management.
-- Notes:
--   - embedding column is a jsonb float[] placeholder; migrate to pgvector when ready
--     by replacing with: vector("embedding", { dimensions: 1536 })
--   - status values: pending | processing | completed | failed
--> statement-breakpoint
CREATE TABLE "library_ai_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"library_item_id" uuid NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"chunk_text" text NOT NULL,
	"token_count" integer,
	"embedding" jsonb,
	"parse_job_id" varchar(255),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"parsed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "library_ai_contexts" ADD CONSTRAINT "library_ai_contexts_tenant_id_tenants_id_fk"
	FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "library_ai_contexts" ADD CONSTRAINT "library_ai_contexts_library_item_id_digital_library_id_fk"
	FOREIGN KEY ("library_item_id") REFERENCES "public"."digital_library"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Index for efficient chunk retrieval by document (primary Bot query pattern)
CREATE INDEX "ai_context_library_item_idx" ON "library_ai_contexts" USING btree ("library_item_id", "chunk_index");
--> statement-breakpoint
-- Index for polling pending/processing jobs in the parse pipeline
CREATE INDEX "ai_context_status_tenant_idx" ON "library_ai_contexts" USING btree ("tenant_id", "status");
