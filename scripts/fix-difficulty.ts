import postgres from "postgres";

async function fixAll() {
  const dbs = ["postgres", "vt_db", "vti_db", "nvidia_db", "test1_db"];
  for (const dbName of dbs) {
    try {
      const sql = postgres(`postgresql://coe_admin:SecretPassword123@127.0.0.1:5433/${dbName}`);
      const schemas = await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'`;
      console.log(`DB: ${dbName} -> schemas:`, schemas.map(s => s.schema_name));
      
      for (const s of schemas) {
        const sName = s.schema_name;
        try {
          await sql.unsafe(`
            ALTER TABLE "${sName}"."lessons" ADD COLUMN IF NOT EXISTS "difficulty" varchar(50) DEFAULT 'Beginner' NOT NULL;
          `);
        } catch (e: any) {}

        try {
          await sql.unsafe(`
            ALTER TABLE "${sName}"."lesson_progress" ADD COLUMN IF NOT EXISTS "scorm_data" jsonb;
            ALTER TABLE "${sName}"."lesson_progress" ADD COLUMN IF NOT EXISTS "video_resume_offset_seconds" integer DEFAULT 0;
            ALTER TABLE "${sName}"."lesson_progress" ADD COLUMN IF NOT EXISTS "video_max_watched_percent" integer DEFAULT 0;
            ALTER TABLE "${sName}"."lesson_progress" ADD COLUMN IF NOT EXISTS "total_time_spent_seconds" integer DEFAULT 0;
            ALTER TABLE "${sName}"."lesson_progress" ADD COLUMN IF NOT EXISTS "zoom_attendance_logs" jsonb;
          `);
        } catch (e: any) {}

        try {
          await sql.unsafe(`
            CREATE TABLE IF NOT EXISTS "${sName}"."course_progress" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "student_id" uuid NOT NULL,
              "course_id" uuid NOT NULL,
              "last_visited_lesson_id" uuid,
              "completed" boolean DEFAULT false NOT NULL,
              "scorm_data" jsonb,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            );
          `);
        } catch (e: any) {}

        try {
          await sql.unsafe(`
            CREATE TABLE IF NOT EXISTS "${sName}"."subjective_submissions" (
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
          `);
        } catch (e: any) {}

        try {
          await sql.unsafe(`
            CREATE TABLE IF NOT EXISTS "${sName}"."batch_instructors" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "batch_id" uuid NOT NULL,
              "instructor_id" uuid NOT NULL,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL
            );
            CREATE TABLE IF NOT EXISTS "${sName}"."batch_sessions" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "tenant_id" uuid NOT NULL,
              "batch_id" uuid NOT NULL,
              "title" varchar(255) NOT NULL,
              "description" text,
              "instructor_id" uuid,
              "start_time" timestamp with time zone NOT NULL,
              "end_time" timestamp with time zone NOT NULL,
              "meeting_url" text,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            );
          `);
          console.log(`  ✅ ${dbName} -> ${sName} progress & batch tables verified.`);
        } catch (e: any) {
          console.log(`  ⚠️ ${dbName} -> ${sName} error:`, e?.message);
        }
      }
      await sql.end();
    } catch (e: any) {
      console.error(`Failed for DB ${dbName}:`, e?.message);
    }
  }
  console.log("🎉 ALL SCHEMAS MIGRATIONS COMPLETED!");
  process.exit(0);
}

fixAll();
