# Wysbryx LMS – Master Phase Roadmap (P0, P1, P2)

---

## 1. Phase P0 

The codebase currently has baseline schemas and UI components for courses, basic batches, users, and quizzes (~45% complete). However, the following **7 core items** are missing or incomplete for Phase P0:

### Missing & Required Changes for Phase P0

#### 1. Excel Bulk Import Engine (Admission & Batches)

- **Missing:**  
  Current code only supports manual 1-by-1 application submission (`AdmissionWizardForm.tsx`).  
  There is no `.xlsx` / `.csv` parser to bulk onboarding students or enroll batch rosters.

- **Changes Needed:**  
  - Create server action / API route to parse Excel files.  
  - Auto-provision user accounts and assign initial credentials.  
  - Ingest batch enrollments for bulk student onboarding.

---

#### 2. Batch Session Timetables & Status

- **Missing:**  
  `schema.ts` has `batches` (name, capacity, dates), but lacks:
  - Session calendar timetables (`sessions` table).  
  - Instructor join mappings (`batch_instructors`).  
  - Batch status enums (`upcoming`, `ongoing`, `completed`, `cancelled`).

- **Changes Needed:**  
  - Add `batch_sessions` table.  
  - Build calendar view UI on Admin / Faculty / Student dashboards.  
  - Introduce batch status enum and display status across dashboards.

---

#### 3. Zoom Webhook Attendance & Recording Sync

- **Missing:**  
  `src/app/api/webhooks/zoom/route.ts` is a basic placeholder stub.  
  It does **not** process `meeting.participant_joined` or `meeting.participant_left` webhooks to track live attendance.

- **Changes Needed:**  
  - Process Zoom webhooks and write student join/leave times into tracking logs.  
  - Auto-sync Zoom cloud recording URLs back to lesson items for replay access.

---

#### 4. Detailed Telemetry in Course Tracking

- **Missing:**  
  `lessonProgress` table in `schema.ts` currently only tracks a boolean `completed` flag.  
  It lacks:
  - Video watch offsets.  
  - Watch percentage.  
  - Zoom live attendance logs.  
  - Total time spent.

- **Changes Needed:**  
  - Expand `lessonProgress` schema with:  
    - `videoResumeOffsetSeconds`  
    - `videoMaxWatchedPercent`  
    - `totalTimeSpentSeconds`  
    - `zoomAttendanceLogs` (`jsonb`)  
  - Surface these telemetry fields in analytics and dashboards.

---

#### 5. Rule-Based Learner Analytics & At-Risk Flags

- **Missing:**  
  `src/app/admin/analytics` displays generic charts, but lacks:
  - Rule-based “at-risk” student detection (e.g. no activity in N days or quiz score `< 50%`).  
  - CSV report generation.

- **Changes Needed:**  
  - Build automated SQL queries for at-risk flags.  
  - Add a CSV export route for admins and mentors.  
  - Display at-risk lists in the analytics UI.

---

#### 6. Subjective Assessment & Manual Evaluator Workspace

- **Missing:**  
  Current quiz engine only evaluates objective MCQs.  
  There is **no** workflow for:
  - Subjective submissions.  
  - Manual grading by internal / external evaluators.

- **Changes Needed:**  
  - Create `subjective_submissions` table.  
  - Build an evaluator portal interface for scoring subjective work.  
  - Add rubric fields, comments, and scoring history.

---

#### 7. Sequential Lesson Unlocking & Resume Position

- **Missing:**  
  Lessons are all accessible simultaneously.  
  There is no:
  - Lock enforcement based on competency level (Beginner vs Advanced).  
  - Persistent “Resume Course” state.

- **Changes Needed:**  
  - Add `unlockPolicy` to `courses`.  
  - Store student last-visited `lessonId` in database state.  
  - Implement sequential unlock logic and a “Resume from last lesson” entry point.

#### 8. Tiered Pricing Models Per Student, Course, and Learning Level

- **Missing:** Current schemas and UI do not support configurable pricing by learning level (Beginner / Intermediate / Advanced), course bundle /       specialization, or per-student discounts and scholarship rules.
- **Changes Needed:**  
  - Add a `pricing_tiers` schema (e.g. `tier_name`, `level`, `base_price`, `currency`, `features_included`).  
  - Link tiers to `courses` and optionally `batches` to support course-level and cohort-level pricing.  
  - Extend enrollment/admission flows so students can choose a tier (e.g. Beginner / Intermediate / Advanced track).  
  - Update admin UI for creating/editing tiers and viewing revenue/usage by tier in analytics and reports.

---

## 2. Phase P1

The PDF and PRD outline **4 AI-powered modules** for Phase P1. Currently, **0% of Phase P1** exists in the codebase.

### Missing & Required Changes for Phase P1

#### 1. Chat Bot (OpenAI API + RAG)

- **Missing:**  
  - RAG pipeline.  
  - Vector store.  
  - OpenAI SDK integration.  
  - Course-embedded chat widget.  
  - Searchable chat history.  
  - Confidence-based escalation to instructors.

- **Changes Needed:**  
  - Integrate OpenAI API with PostgreSQL `pgvector` / Pinecone.  
  - Embed RAG knowledge over Digital Library and course content.  
  - Build `<ChatBotWidget />` and attach it contextually in courses.  
  - Store chat transcripts and confidence scores.

---

#### 2. Book Bot (Local LLM In-House Knowledge Engine)

- **Missing:**  
  - Local LLM hosting setup.  
  - PDF text extraction pipeline for Digital Library documents.  
  - Full-text / semantic indexing engine.

- **Changes Needed:**  
  - Set up local LLM inference service (e.g., Ollama / vLLM).  
  - Build document chunking & indexing worker.  
  - Create `knowledge_indexes` table to store embeddings / metadata.  
  - Connect Book Bot to the Digital Library for retrieval.

---

#### 3. Analytics Bot (AI Performance Analytics)

- **Missing:**  
  - AI weak-topic identification.  
  - Progress forecasting.  
  - Personalized recommendation engine.

- **Changes Needed:**  
  - Build an AI analytical model that reads:
    - Student quiz performance.  
    - Question tags / topics.  
  - Recommend targeted remedial content per student.  
  - Expose these suggestions inside analytics and course dashboards.

---

#### 4. Concept Bot (Intelligent Learning Companion)

- **Missing:**  
  - Prerequisite concept mapping.  
  - Personalized study plan generation.  
  - Learning gap detection.

- **Changes Needed:**  
  - Add `concept_graph` schema linking prerequisite topics to course modules.  
  - Construct personalized study plan generator based on gaps.  
  - Surface recommended concepts and study paths per learner.

---

## 3. Phase P2 – Ecosystem & Specialized Modules  
Currently, **0% of Phase P2** exists in the codebase.

### Missing & Required Changes for Phase P2

#### 1. Internship & Learning Journey Ecosystem

- **Missing:**  
  Hubs for:
  - Learning COE  
  - HighFi COE  
  - Learning Lab  
  - Challenge Lab  
  - Experiment Lab  
  - Solution Lab (where students publish research papers, documents, and showcase projects).

- **Changes Needed:**  
  - Add `solution_lab_publications` table.  
  - Create a student publication showcase portal.  
  - Integrate publication flows into the broader learning journey.

---

#### 2. Mentorship Module

- **Missing:**  
  - Restricted mentor access.  
  - Mentor request flow.  
  - Mentor profiles (Name, Area of Expertise, Short Bio, Specialization).  
  - Mentor activity assignments (book / assessment recommendations).  
  - Direct messaging / discussion forums.

- **Changes Needed:**  
  - Create `mentors`, `mentorship_requests`, `mentor_assignments` tables.  
  - Build direct messaging components.  
  - Implement discussion board threads linked to mentors / cohorts.  

---

#### 3. Japanese Learning Module 

- **Missing:**  
  - Vocabulary learning.  
  - Japanese script / alphabet (Hiragana, Katakana, Kanji) exercises.  
  - Vocabulary assessments.  
  - Pronunciation evaluation.

- **Changes Needed:**  
  - Build interactive stroke-order script renderer.  
  - Implement audio pronunciation evaluator.  
  - Design vocabulary database and learning flows.  
  - Connect assessments to learner analytics.

---

#### 4. Japanese Textbook OCR Engine

- **Missing:**  
  OCR digitization pipeline converting Japanese printed materials into searchable digital text integrated with Digital Library and Book Bot.

- **Changes Needed:**  
  - Integrate Tesseract / Vision OCR engine.  
  - Build document extraction & review workflow.  
  - Link output to `digitalLibrary` and Book Bot indexes.  

---

## 4. Master Roadmap Across All 3 Phases

flowchart TD
    subgraph Phase P0 [Phase P0 - Target: 30 Aug 2026]
        P0_A[Excel Bulk Import Engine]
        P0_B[Batch Session Timetable Schema & Calendar UI]
        P0_C[Zoom Webhook Attendance & Recording Sync]
        P0_D[Telemetry Upgrade: Video Watch % & Zoom Join/Leave Logs]
        P0_E[Rule-Based At-Risk Flags & CSV Exporter]
        P0_F[Subjective Evaluation Workspace]
        P0_G[Sequential Lesson Lock & Resume Position]
        P0_H[Tiered Pricing Models Per Student/Course/Level]
    end
    subgraph Phase P1 [Phase P1 - AI Deliverables]
        P1_A[Chat Bot - OpenAI + RAG + Chat Widget]
        P1_B[Book Bot - Local LLM Knowledge Indexer]
        P1_C[Analytics Bot - AI Weak-Topic Identifier]
        P1_D[Concept Bot - Study Plan & Prerequisite Engine]
    end
    subgraph Phase P2 [Phase P2 - Ecosystem & Specialized]
        P2_A[Solution Lab - Research Paper & Project Showcase]
        P2_B[Restricted Mentorship & Direct Messaging]
        P2_C[Japanese Language & Script Learning Module]
        P2_D[Japanese Textbook OCR Digitization Pipeline]
    end

    
    Phase P0 --> Phase P1 --> Phase P2
