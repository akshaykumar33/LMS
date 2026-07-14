import { redirect } from "next/navigation";
import { getTenantContext } from "@/features/auth/services/tenant";
import { requireAuth } from "@/features/auth/services/session";
import { CourseRepository } from "@/features/course/repository/course-repository";
import { QuizRepository } from "@/features/quiz/repository/quiz-repository";
import { db } from "@/db/db";
import { students, users, quizzes, lessonProgress, projects, projectSubmissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkspaceClient } from "@/features/course/components/WorkspaceClient";

interface PageProps {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lessonId?: string; quizId?: string }>;
}

export default async function CourseWorkspacePage({ params, searchParams }: PageProps) {
  const tenant = await getTenantContext();
  if (!tenant) redirect("/");

  const user = await requireAuth();

  // Redirect non-student roles that are completely restricted
  if (user.role === "Placement Officer") {
    redirect("/admin/placement");
  }

  // Resolve params
  const { courseId } = await params;
  const { lessonId, quizId } = await searchParams;

  // Fetch course detail outline
  const courseDetails = await CourseRepository.getCourseDetails(tenant.id, courseId);
  if (!courseDetails) {
    redirect("/dashboard");
  }

  // Fetch quizzes of this course
  const courseQuizzes = await db
    .select({ id: quizzes.id, title: quizzes.title, lessonId: quizzes.lessonId })
    .from(quizzes)
    .where(eq(quizzes.courseId, courseId));

  // Get first lesson as default if nothing is selected
  let activeLessonId = lessonId;
  let activeQuizId = quizId;

  if (!activeLessonId && !activeQuizId) {
    const firstMod = courseDetails.modules[0];
    const firstLesson = firstMod?.lessons[0];
    if (firstLesson) {
      activeLessonId = firstLesson.id;
    }
  }

  // Load active content
  let activeLesson = null;
  if (activeLessonId) {
    activeLesson = await CourseRepository.getLesson(tenant.id, activeLessonId);
  }

  let activeQuiz = null;
  if (activeQuizId) {
    if (activeQuizId === "any") {
      const firstQuiz = courseQuizzes[0];
      if (firstQuiz) {
        activeQuiz = await QuizRepository.getQuizDetails(tenant.id, firstQuiz.id);
      }
    } else {
      activeQuiz = await QuizRepository.getQuizDetails(tenant.id, activeQuizId);
    }
  }

  // Fetch student profile details
  let studentProfile: any = null;
  if (user.role === "Student") {
    studentProfile = await db.query.students.findFirst({
      where: eq(students.userId, user.userId),
      with: {
        batch: true,
      },
    });

    if (!studentProfile) {
      redirect("/dashboard");
    }
  }

  // Fetch lesson completions for this student
  let completedLessonIds: string[] = [];
  if (studentProfile) {
    const progresses = await db.query.lessonProgress.findMany({
      where: eq(lessonProgress.studentId, studentProfile.id),
    });

    completedLessonIds = progresses
      .filter((p) => p.completed)
      .map((p) => p.lessonId);
  }

  // Fetch capstone project details for this course
  const capstoneProject = await db.query.projects.findFirst({
    where: eq(projects.courseId, courseId),
  });

  let capstoneSubmission = null;
  if (capstoneProject && studentProfile) {
    capstoneSubmission = await db.query.projectSubmissions.findFirst({
      where: and(
        eq(projectSubmissions.projectId, capstoneProject.id),
        eq(projectSubmissions.studentId, studentProfile.id)
      ),
    });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.userId),
  });

  const userData = {
    userId: user.userId,
    firstName: dbUser?.firstName || "Student",
    lastName: dbUser?.lastName || "",
    email: dbUser?.email || user.email,
    role: user.role,
  };

  return (
    <DashboardLayout user={userData} tenant={tenant} studentProfile={studentProfile}>
      <WorkspaceClient
        course={courseDetails}
        quizzes={courseQuizzes}
        activeLesson={activeLesson}
        activeQuiz={activeQuiz}
        completedLessonIds={completedLessonIds}
        capstoneProject={capstoneProject}
        capstoneSubmission={capstoneSubmission}
        tenantName={tenant.name}
        primaryColor={tenant.branding?.primaryColor}
        user={userData}
        enableProctoring={!!(tenant.settings as any)?.features?.enableProctoring}
        enableAi={(tenant.settings as any)?.ai?.enableAi !== false}
      />
    </DashboardLayout>
  );
}
