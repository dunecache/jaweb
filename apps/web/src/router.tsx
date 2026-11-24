import type { Role } from "@jaweb/shared";
import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router";
import { LoadingState } from "@/components/app/data-state";
import { PlaceholderShell } from "@/components/app/placeholder-shell";
import { useMe } from "@/lib/auth";
import { LeaderboardPage } from "@/routes/leaderboard/leaderboard-page";
import { LoginPage } from "@/routes/login/login-page";
import { StudentPage } from "@/routes/student/student-page";
import { ClassesPage } from "@/routes/teacher/classes-page";
import { ExerciseEditorPage } from "@/routes/teacher/exercise-editor-page";
import { ExercisesPage } from "@/routes/teacher/exercises-page";
import { ModulesPage } from "@/routes/teacher/modules-page";
import { StudentsPage } from "@/routes/teacher/students-page";
import { TeacherLayout, TeacherOverviewPage } from "@/routes/teacher/teacher-layout";

function GuardLoading() {
  return (
    <div className="mx-auto max-w-[720px] p-8" role="status" aria-label="Checking session">
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
    ],
  },
  {
    path: "/student",
    element: (
      <RequireAuth requiredRole="student">
        <Outlet />
      </RequireAuth>
    ),
    children: [{ index: true, element: <StudentPage /> }],
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
  return <RouterProvider router={router} />;
}
