# 📑 Master Learning Management System (LMS) Requirements & Gap Analysis Document

**Project:** Learning Management System (LMS)  
**Date:** July 2026  
**Document Author:** Ayush Kashyap / Antigravity AI  
**Target Go-Live Date:** 30 August 2026  
**Billing Start Date:** 30 August 2026  
**Target Audience:** Engineering, Product Managers, Client Stakeholders  

---

## 1. Executive Summary & Project Baseline

| Parameter | Value / Detail | Notes / Implications |
|:---|:---|:---|
| **Project Name** | Learning Management System (LMS) | Multi-tenant corporate & academic LMS platform |
| **Phase P0 Go-Live** | 30 August 2026 | Hard deadline for Phase P0 core modules |
| **Billing Start** | 30 August 2026 | Milestone tied to P0 production deployment |
| **Phase 1 Posture** | Manual-First | No self-serve signup; no automated payment gateway integration; manual credential distribution |
| **Onboarding Strategy**| Excel Bulk Import (`.xlsx`/`.csv`) | Core mechanism for creating learner accounts and cohort roster ingestion |
| **Core Architecture Spine**| Batch Scheduling & Course Tracking | Load-bearing models feeding Course Delivery, Zoom, Learner Analytics, and Phase P1 AI |

---

## 2. Complete Phase P0 Module Specifications

| Module Name | Status | Objective / Core Scope | Data Model & Technical Specs | Key Assumptions & Constraints |
|:---|:---|:---|:---|:---|
| **3.1 Admission Management** | `[CLIENT-CONFIRMED]` | Bulk student onboarding & manual student provisioning | Bulk Excel import (`.xlsx`/`.csv`) creating learner accounts. Flexible assignment to learning plans/roles without re-creating user records. | Manual payment logging; no payment gateway integration required for Phase 1. Credentials shared manually by client. |
| **3.2 Batch Scheduling** | `[PROPOSED]` | Cohort management & calendar timetabling | Batch (name, course, start/end dates, capacity, status: upcoming/ongoing/completed/cancelled). Batch ↔ Instructors, Batch ↔ Students, Timetable Sessions. | Shared bulk Excel import path with Admission Management. Serves as scheduling backbone for Zoom & Delivery. |
| **3.3 Course Selection** | `[CLIENT-CONFIRMED]` | Centralized Admin Course Catalogue | Course entity, category tags, competency level tracks (Beginner, Intermediate, Advanced) with distinct learning paths and pricing models. | Focuses on admin catalogue management and competency track assignments. |
| **3.4 Course Delivery** | `[PROPOSED]` | Hierarchical content consumption engine | Structure: Course → Module → Lesson. Content types: Video, Library Document, Quiz, Live Session (Zoom). Resume-from-last-position. | Configurable navigation: Sequential unlocking for Beginner vs. Free Navigation for Advanced. |
| **3.5 Course Tracking** | `[PROPOSED]` | Unified raw telemetry logging engine | Tracks % completion, video watch progress (% watched, resume offset timestamp), quiz attempts/scores, Zoom live attendance (join/leave), total time spent. | Serves as raw data provider for P0 Learner Analytics and Phase P1 Analytics Bot. |
| **3.6 Learner Analytics** | `[PROPOSED]` | Rule-based non-AI reporting dashboards | Aggregated metrics (enrollments, completion %, avg quiz scores, batch progress), simple rule-based "at-risk" flags (e.g. inactive >7 days, score <50%), CSV exports. | Rule-based scope only; defers all AI/ML insights to Phase P1 Analytics Bot. |
| **3.7 Digital Library** | `[CLIENT-CONFIRMED]` | Centralized repository for learning materials | Stores course materials, textbooks, research PDFs, reference docs. Metadata structure designed to support future RAG indexing. | Knowledge base foundation for learners, instructors, and Phase P1 Book Bot. |
| **3.8 Zoom Live Tutor Integration** | `[PROPOSED]` | Live class delivery mechanism | Bound to Batch Timetable. Creates Zoom meeting via API, places join link on student dashboard, ingests webhook join/leave attendance, embeds cloud recordings. | Dependent on client Zoom plan supporting API access, Webhooks, and Cloud Recording. |
| **3.9 Learning Videos** | `[PROPOSED]` | Transcoded video streaming content type | Video upload → cloud storage / CDN transcoding (S3 + CloudFront / HLS) → custom player wrapper reporting watch progress (% & timestamp) to Tracking. | Requires infrastructure decision on video hosting vendor. |
| **3.10 Quizzes & Worksheets** | `[CLIENT-CONFIRMED]` | Objective assessment module | Objective MCQ-based quizzes with real-time automatic answer evaluation and score calculation. | Advanced assessment types and external integrations explicitly deferred beyond P0. |
| **3.11 Assessment** | `[CLIENT-CONFIRMED]` | Dual evaluation (Auto + Manual) module | MCQ auto-grading + manual grading workflow for subjective assessments, allowing internal/external evaluators to assign marks. | Requires workflow routing, evaluator assignment logic, and SLA management. |
| **3.12 Certification** | `[CLIENT-CONFIRMED]` | Automated certificate generation & issuance | Auto-generates verifiable PDF certificate when student satisfies course completion and pass mark criteria. | Requires client confirmation on template layout, verification mechanism, and passing threshold. |

---

## 3. PDF Meeting Minutes (MoM) Phase Breakdown

| Phase | Category | Feature / Requirement | Functional Details & Specifications | Target Audience |
|:---|:---|:---|:---|:---|
| **Phase 1** | Registration | Manual Student Onboarding | Registration & payment processing manual. Credential distribution manual. Bulk Excel import for account creation. | Admins, Students |
| **Phase 1** | Provisioning | Student Role & Plan Management | Assign students to courses, research programs, and personalized learning plans. Move students between plans/roles without account recreation. | Admins |
| **Phase 1** | Competency | Personalized Learning Paths & Tiers | Competency levels (Beginner, Intermediate, Advanced) with differentiated learning paths, course recommendations, and multi-model pricing. | Students |
| **Phase P0** | Core LMS | 12 Core Deliverables | Admission, Batches, Catalogue, Delivery, Tracking, Analytics, Library, Zoom, Video, Quizzes, Assessment, Certification (due 30 Aug 2026). | All Users |
| **Phase P1** | AI Module | Chat Bot (Client OpenAI API) | Conversational RAG assistant using OpenAI API over course syllabus, materials, Digital Library, research docs, and Book Bot index. Embedded chat widget, searchable history, low-confidence escalation to instructors, FAQ analytics. | Students, Instructors, Admins |
| **Phase P1** | AI Module | Book Bot (Local LLM Engine) | In-house local LLM hosted on infrastructure. Ingests, processes, organizes, and indexes institutional learning content. Full-text & semantic indexing, content tagging, RAG foundation for Chat Bot. | Students, Instructors, Admins |
| **Phase P1** | AI Module | Analytics Bot | AI-driven performance analytics, learning progress tracking, weak topic identification, instructor insights, admin dashboards, personalized recommendations. | Admins, Instructors |
| **Phase P1** | AI Module | Concept Bot | Recommends prerequisite concepts, suggests personalized learning paths, recommends quizzes/assessments, identifies learning gaps, generates personalized study plans. | Students |
| **Phase P2** | Ecosystem | Internship & Learning Journey | Structured learning ecosystem: Learning COE, HighFi COE, Learning Lab, Challenge Lab, Experiment Lab, Mentor Program, Solution Lab. | Students, Mentors |
| **Phase P2** | Pricing Engine| Multi-Tier Dynamic Pricing Models | Different pricing models offered based on Student Category, Course Selection, and Learning Competency Level (Beginner / Intermediate / Advanced). | Admins, Finance |
| **Phase P2** | Solution Lab| Research Paper & Project Showcase | Students publish documents, publish research papers, and showcase projects/research work in Solution Lab. | Students, Public |
| **Phase P2** | Mentorship | Restricted Mentor System | Restricted mentor access (list from Sundar), student mentorship request workflow, concise mentor profiles (Name, Expertise, Bio, Specialization), optional admin ratings. Mentors recommend books, assign activities/assessments/resources. Direct Messaging / Discussion Boards. | Students, Mentors |
| **Phase P2** | Language | Japanese Learning Module | Vocabulary learning, Japanese script/alphabet (Hiragana/Katakana/Kanji) exercises, vocabulary assessments, pronunciation evaluation, language exercises. | Language Learners |
| **Phase P2** | OCR Tech | Japanese Textbook OCR | Converts Japanese textbooks & printed learning materials into searchable, editable digital content. Stores output in LMS & integrates with Digital Library and Book Bot. | Admins, AI Engine |

---

## 4. Line-by-Line Codebase Audit & Gap Analysis

| Feature Area | Current Codebase Implementation (`src/`) | PRD / PDF Requirement | Status & Gap Identified | Action Required across Codebase |
|:---|:---|:---|:---|:---|
| **Admission Onboarding** | `AdmissionWizardForm.tsx`, `admissionApplications` table | Excel bulk student import & auto-account creation | ⚠️ **Partial Gap**: Only 1-by-1 manual wizard exists; no Excel parser. | Create server action & UI for `.xlsx`/`.csv` bulk parsing and user provisioning. |
| **Batch Scheduling** | `batches` table in `schema.ts` | Batch timetable sessions, status, instructor links, calendar UI | ⚠️ **Partial Gap**: Missing `sessions` timetable schema and calendar UI. | Add `batch_sessions` table, `status` enum, `batch_instructors` join table, and calendar views. |
| **Course Delivery** | `modules`, `lessons` tables in `schema.ts` | Sequential lesson unlocking by track & resume position | ⚠️ **Partial Gap**: No lock enforcement; lessons all unlocked by default. | Add `unlockPolicy` to `courses`, backend lock check, and last visited `lessonId` persistence. |
| **Course Tracking** | `lessonProgress` table in `schema.ts` | Comprehensive telemetry (video offset, Zoom join/leave, total time) | ⚠️ **Partial Gap**: Only tracks a boolean `completed` flag. | Expand `lessonProgress` schema with `videoResumeOffsetSeconds`, `videoMaxWatchedPercent`, `zoomAttendanceLogs` jsonb. |
| **Learner Analytics** | `AnalyticsConsole.tsx` | Rule-based "at-risk" flags & CSV exports | ⚠️ **Partial Gap**: Generic charts only; no automated risk rules or CSV exporter. | Build rule-based SQL queries flagging inactive/low-score students and add CSV download route. |
| **Zoom Live Tutor** | `zoom-service.ts`, `src/app/api/webhooks/zoom/route.ts` | Meeting API creation, webhook attendance logging, cloud recording sync | ⚠️ **Partial Gap**: Webhook handler is a stub; no attendance auto-logging. | Update webhook handler to parse `participant_joined`/`left` events and update `lessonProgress`. |
| **Assessment & Grading** | `quizzes`, `quizAttempts` tables | MCQ auto-grading + manual subjective assessment grading | ⚠️ **Partial Gap**: Only MCQ auto-grading handled; no subjective workflow. | Add `subjective_submissions` table and evaluator review workspace UI. |
| **Certification** | `certificates` table in `schema.ts` | Automated certificate issuance upon passing thresholds | ⚠️ **Partial Gap**: Certificate table exists, but no automatic threshold trigger. | Implement backend trigger issuing certificate when student meets pass mark & completion status. |
| **Phase P1 Chat Bot** | ❌ None | OpenAI API + RAG over LMS content, embedded chat widget, escalation | 🔴 **Missing (0%)**: No AI SDK, vector DB, or chat UI. | Add `@langchain/openai`, vector store, RAG ingestion, and `<ChatBotWidget />`. |
| **Phase P1 Book Bot** | ❌ None | In-house local LLM indexing Digital Library into RAG repository | 🔴 **Missing (0%)**: No local LLM or document indexing service. | Setup local LLM service (Ollama/vLLM), text chunker, and `knowledge_indexes` table. |
| **Phase P1 Analytics Bot**| ❌ None | AI weak-topic identification & progress forecasting | 🔴 **Missing (0%)**: No AI analytics logic. | Build quiz question tag error frequency analyzer and completion predictor model. |
| **Phase P1 Concept Bot** | ❌ None | Prerequisite concept recommendations & personalized study plans | 🔴 **Missing (0%)**: No concept graph. | Add `concept_graph` schema and study plan recommendation engine. |
| **Phase P2 Dynamic Pricing**| ❌ None | Dynamic pricing models by Student Category, Course, & Competency Level (Beginner / Intermediate / Advanced) | 🔴 **Missing (0%)**: No multi-tier pricing engine. | Add `course_pricing_tiers` schema (`id`, `courseId`, `studentCategory`, `competencyLevel`, `price`) and billing calculation service. |
| **Phase P2 Solution Lab** | ❌ None | Publishing documents, research papers, project showcase | 🔴 **Missing (0%)**: Only generic `projects` table exists. | Add `solution_lab_publications` table and research paper publishing portal. |
| **Phase P2 Mentorship** | ❌ None | Restricted mentor profiles, request flow, activity assignment, messaging | 🔴 **Missing (0%)**: No mentor system. | Add `mentors`, `mentorship_requests`, `mentor_assignments` tables & Messaging UI. |
| **Phase P2 Japanese Learning**| ❌ None | Vocabulary, script/alphabet exercises, pronunciation evaluation | 🔴 **Missing (0%)**: No language module. | Create `japanese_vocabulary` schema, stroke-order drawing UI, and audio evaluator. |
| **Phase P2 Japanese OCR**| ❌ None | Textbook OCR digitization into searchable digital content for Digital Library & Book Bot | 🔴 **Missing (0%)**: No OCR pipeline. | Integrate Tesseract/Vision OCR engine, text extraction review UI, and library auto-indexer. |

---

## 5. Summary of Required Codebase Changes by Phase

| Phase | Component / Area | File / Directory Target | Codebase Changes Required |
|:---|:---|:---|:---|
| **P0** | Admission Engine | `src/features/admission/` | Add `ExcelImportService.ts` and `<ExcelUploadModal />` component. |
| **P0** | Database Schema | `src/db/schema.ts` | Add `batch_sessions`, `batch_instructors`, `subjective_submissions` tables; update `batches`, `lessonProgress`, `courses`. |
| **P0** | Zoom Integration | `src/app/api/webhooks/zoom/route.ts` | Process `meeting.participant_joined` & `left` to update `lessonProgress.zoomAttendanceLogs`. |
| **P0** | Analytics & Export | `src/features/analytics/` & `src/app/api/` | Add rule-based at-risk calculation queries and CSV download endpoint. |
| **P0** | Subjective Grading | `src/features/quiz/` & `src/app/faculty/` | Build evaluator submission review workspace UI. |
| **P0** | Course Unlocking | `src/features/course/` | Implement sequential lesson unlock check middleware / service function. |
| **P1** | AI RAG Engine | `src/lib/ai/` & `src/app/api/chat/` | Add OpenAI API client, vector store embeddings, and RAG retrieval service. |
| **P1** | Book Bot Indexer | `src/lib/ai/book-bot/` | Add PDF text extractor, local LLM inference client, and `knowledge_indexes` table. |
| **P1** | Chat Widget UI | `src/components/ChatBotWidget.tsx` | Build floating chat widget embedded across course & student layouts. |
| **P1** | Analytics & Concept | `src/features/analytics/services/` | Implement quiz concept tag weak-topic analyzer and study plan generator. |
| **P2** | Dynamic Pricing | `src/features/pricing/` | Add `course_pricing_tiers` table and multi-tier pricing calculation engine by student category & competency level. |
| **P2** | Solution Lab Portal | `src/features/solution-lab/` | Create paper publishing portal (`solution_lab_publications` table & showcase UI). |
| **P2** | Mentorship Module | `src/features/mentorship/` | Add `mentors`, `mentorship_requests` schemas and direct messaging UI. |
| **P2** | Japanese Learning | `src/features/japanese/` | Add vocabulary/script database, stroke order canvas, and audio pronunciation tester. |
| **P2** | Japanese OCR | `src/features/ocr/` | Integrate OCR engine (Tesseract/Vision API) to extract text into Digital Library. |

---

## 6. Consolidated Client Sign-Off Checklist (8 Items)

| # | Item Description | Proposed Default / Design Choice | Client Confirmation Required | Status |
|:---|:---|:---|:---|:---|
| **1** | **Excel Bulk Import Schema** | Standardized headers (`FirstName`, `LastName`, `Email`, `RollNo`, `BatchCode`) | Confirm exact Excel template columns and error validation handling | ⏳ Pending Client |
| **2** | **Batch Scheduling Rules** | Single active batch per student; waitlisting disabled by default | Confirm if multi-batch enrollment or waitlisting is required | ⏳ Pending Client |
| **3** | **Course Delivery Unlocking** | Sequential unlock for Beginner track; Free Navigation for Advanced track | Confirm default navigation rules per competency level | ⏳ Pending Client |
| **4** | **Zoom API & Recording** | LMS creates scheduled meetings via API; webhooks capture attendance | Confirm Zoom account provides API OAuth, Webhook access, & Cloud Recording | ⏳ Pending Client |
| **5** | **Learning Videos Hosting** | AWS S3 + CloudFront / HLS adaptive streaming | Confirm video hosting provider preference or approve AWS recommendation | ⏳ Pending Client |
| **6** | **Learner Analytics Scope** | Rule-based dashboards, CSV exports, and threshold-based at-risk flags | Confirm rule-based P0 scope (deferring AI analytics to P1 Analytics Bot) | ⏳ Pending Client |
| **7** | **Subjective Assessment Workflow** | Manual score entry by assigned internal/external evaluators | Confirm evaluator assignment rules, grading SLA, and notification workflow | ⏳ Pending Client |
| **8** | **Certification Pass Criteria** | Auto-issuance when all lessons complete and aggregate quiz score $\ge 70\%$ | Confirm certificate visual layout, digital signature, & pass mark threshold | ⏳ Pending Client |
