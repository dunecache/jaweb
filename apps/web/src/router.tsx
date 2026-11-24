import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router";
import { PlaceholderShell } from "./components/app/placeholder-shell";
import { LeaderboardPage } from "./routes/leaderboard/leaderboard-page";
import { LoginPage } from "./routes/login/login-page";
import { StudentPage } from "./routes/student/student-page";
import { TeacherPage } from "./routes/teacher/teacher-page";

// Role guards and server-verified session checks are added in Phase 1.
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  {
    path: "/teacher",
    element: <Outlet />,
    children: [{ index: true, element: <TeacherPage /> }],
  },
  {
    path: "/student",
    element: <Outlet />,
    children: [{ index: true, element: <StudentPage /> }],
  },
  { path: "/leaderboard", element: <LeaderboardPage /> },
  {
    path: "*",
    element: <PlaceholderShell title="Not found" subtitle="There is nothing at this address." />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
