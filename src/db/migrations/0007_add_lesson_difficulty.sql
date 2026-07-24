ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "difficulty" varchar(50) DEFAULT 'Beginner' NOT NULL;
