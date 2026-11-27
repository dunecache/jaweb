import type { Role } from "@jaweb/shared";
import { lazy, type ReactNode, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router";

import { LoadingState } from "@/components/app/data-state";
import { PlaceholderShell } from "@/components/app/placeholder-shell";
import { useMe } from "@/lib/auth";

// Route trees are code-split: teachers and students only download their own views.
const LoginPage = lazy(() =>
  import("@/routes/login/login-page").then((m) => ({ default: m.LoginPage })),
);
const StudentPage = lazy(() =>
  import("@/routes/student/student-page").then((m) => ({ default: m.StudentPage })),
);
const HistoryPage = lazy(() =>
  import("@/routes/student/history-page").then((m) => ({ default: m.HistoryPage })),
);
const LeaderboardPage = lazy(() =>
  import("@/routes/leaderboard/leaderboard-page").then((m) => ({ default: m.LeaderboardPage })),
);
const TeacherLayout = lazy(() =>
  import("@/routes/teacher/teacher-layout").then((m) => ({ default: m.TeacherLayout })),
);
const TeacherOverviewPage = lazy(() =>
  import("@/routes/teacher/teacher-layout").then((m) => ({ default: m.TeacherOverviewPage })),
);
const ClassesPage = lazy(() =>
  import("@/routes/teacher/classes-page").then((m) => ({ default: m.ClassesPage })),
);
const StudentsPage = lazy(() =>
  import("@/routes/teacher/students-page").then((m) => ({ default: m.StudentsPage })),
);
const ModulesPage = lazy(() =>
  import("@/routes/teacher/modules-page").then((m) => ({ default: m.ModulesPage })),
);
const ExercisesPage = lazy(() =>
  import("@/routes/teacher/exercises-page").then((m) => ({ default: m.ExercisesPage })),
);
const ExerciseEditorPage = lazy(() =>
  import("@/routes/teacher/exercise-editor-page").then((m) => ({ default: m.ExerciseEditorPage })),
);
const MonitorPage = lazy(() =>
  import("@/routes/teacher/monitor-page").then((m) => ({ default: m.MonitorPage })),
);
const ReviewPage = lazy(() =>
  import("@/routes/teacher/review-page").then((m) => ({ default: m.ReviewPage })),
);
const SettingsPage = lazy(() =>
  import("@/routes/teacher/settings-page").then((m) => ({ default: m.SettingsPage })),
);

function GuardLoading() {
  return (
    <div className="mx-auto max-w-[720px] p-8">
      <LoadingState label="Checking session" />
    </div>
  );
}

// Role comes from the server-verified /auth/me query, never from client state.
function RequireAuth({ requiredRole, children }: { requiredRole?: Role; children: ReactNode }) {
  const { data: user, isLoading, isError } = useMe();
  if (isLoading) return <GuardLoading />;
  if (isError || !user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} replace />;
  }
  return <>{children}</>;
}

function HomeRedirect() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <GuardLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} replace />;
}

const router = createBrowserRouter([
  { path: "/", element: <HomeRedirect /> },
  { path: "/login", element: <LoginPage /> },
  {
    path: "/teacher",
    element: (
      <RequireAuth requiredRole="teacher">
        <TeacherLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <TeacherOverviewPage /> },
      { path: "classes", element: <ClassesPage /> },
      { path: "students", element: <StudentsPage /> },
      { path: "modules", element: <ModulesPage /> },
      { path: "exercises", element: <ExercisesPage /> },
      { path: "exercises/:id", element: <ExerciseEditorPage /> },
      { path: "exercises/:id/monitor", element: <MonitorPage /> },
      { path: "review", element: <ReviewPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "/student",
    element: (
      <RequireAuth requiredRole="student">
        <Outlet />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <StudentPage /> },
      { path: "history", element: <HistoryPage /> },
    ],
  },
  {
    path: "/leaderboard",
    element: (
      <RequireAuth>
        <LeaderboardPage />
      </RequireAuth>
    ),
  },
  {
    path: "*",
    element: <PlaceholderShell title="Not found" subtitle="There is nothing at this address." />,
  },
]);

export function Router() {
  return (
    <Suspense fallback={<GuardLoading />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
