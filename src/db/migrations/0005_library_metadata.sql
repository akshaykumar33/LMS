-- Migration: 0005_library_metadata
-- Purpose: Extend digital_library with book-readiness metadata fields,
--          tag taxonomy (categories, target courses, formats), and an
--          AI Book Bot context bag for future semantic indexing.
-- All columns are nullable — fully backward-compatible with existing rows.
--> statement-breakpoint
ALTER TABLE "digital_library" ADD COLUMN "tags" jsonb;
--> statement-breakpoint
ALTER TABLE "digital_library" ADD COLUMN "target_course_ids" jsonb;
--> statement-breakpoint
ALTER TABLE "digital_library" ADD COLUMN "format" varchar(50);
--> statement-breakpoint
ALTER TABLE "digital_library" ADD COLUMN "metadata" jsonb;
