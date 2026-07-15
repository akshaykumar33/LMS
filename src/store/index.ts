/**
 * @file index.ts
 * @description Barrel export for all Zustand stores.
 *
 * Import from "@/store" rather than individual files to keep imports tidy.
 *
 * Example:
 *   import { useAuthStore, useTenantStore, useUIStore } from "@/store";
 */

export { useAuthStore }           from "./auth-store";
export type { AuthUser, UserRole } from "./auth-store";

export { useTenantStore }                                                from "./tenant-store";
export type { TenantInfo, TenantBranding, TenantFeatures, TenantGateways, TenantRestrictions } from "./tenant-store";

export { useUIStore }             from "./ui-store";
export type { ThemeMode, Toast }  from "./ui-store";

export { useGamificationStore }   from "./gamification-store";
export type { Badge }             from "./gamification-store";

export { useNotificationStore }   from "./notification-store";
export type { AppNotification }   from "./notification-store";

export { useAdmissionsStore }     from "./admissions-store";
export type { AdmissionApplication, EnrollmentResult } from "./admissions-store";

export { useAnalyticsStore }      from "./analytics-store";
export type { AnalyticsTab, TierFilter, StatusFilter, SortField, SortOrder, ChartMetric, TenantAnalytics } from "./analytics-store";

export { useCareerStore }         from "./career-store";
export type { CareerView, OpportunityType, JobPosting as CareerJobPosting, StudentApplication, CareerMessage } from "./career-store";

export { usePlacementStore }      from "./placement-store";
export type { PlacementTab, JobPosting as PlacementJobPosting, JobFormFields } from "./placement-store";

export { useSuperAdminStore }     from "./super-admin-store";
export type { TenantRecord, SuperAdminMainTab, PermissionMatrixData } from "./super-admin-store";

export { useSuperAdminFormStore } from "./super-admin-form-store";
export type { ModalTab, ViewMode } from "./super-admin-form-store";

export { useCourseManagerStore }  from "./course-manager-store";
export type { Course, CourseModule, Lesson, CourseFeedback } from "./course-manager-store";

export { useFacultyStore }        from "./faculty-store";
export type { FacultyTab, ProctorAttempt, ProctorEvent, GradeStatus, GradingMessage } from "./faculty-store";

export { useQuizStore }           from "./quiz-store";
export type { QuizStep }          from "./quiz-store";

// Hydrator components (client-only — used inside Server Component trees)
export { AuthHydrator, TenantHydrator, GamificationHydrator } from "./hydrators";
