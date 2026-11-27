import { Link, Outlet, useLocation, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/lib/auth";

export function TeacherLayout() {
  const logout = useLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: user } = useMe();

  const navItems = [
    { to: "/teacher/classes", label: "Classes" },
    { to: "/teacher/students", label: "Students" },
    { to: "/teacher/modules", label: "Modules" },
    { to: "/teacher/exercises", label: "Exercises" },
    { to: "/teacher/review", label: "Review" },
    { to: "/teacher/settings", label: "Settings" },
    { to: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:text-foreground focus:ring-3 focus:ring-ring"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              to="/teacher"
              className="font-serif text-xl font-semibold text-foreground"
              translate="no"
            >
              Jaweb
            </Link>
            <nav
              className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground"
              aria-label="Teacher navigation"
            >
              {navItems.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  aria-current={pathname === to ? "page" : undefined}
                  className={pathname === to ? "text-foreground" : "hover:text-foreground"}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{user?.displayName}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void logout().then(() => navigate("/login", { replace: true }));
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1200px] px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

export function TeacherOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Teacher</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your classes and students. Curriculum authoring arrives in Phase 2.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/teacher/classes"
          className="rounded-xl border border-border bg-card p-6 hover:border-primary"
        >
          <h2 className="font-serif text-lg text-foreground">Classes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sections your exercises will belong to.</p>
        </Link>
        <Link
          to="/teacher/students"
          className="rounded-xl border border-border bg-card p-6 hover:border-primary"
        >
          <h2 className="font-serif text-lg text-foreground">Students</h2>
          <p className="mt-1 text-sm text-muted-foreground">Accounts, rosters, and passwords.</p>
        </Link>
        <Link
          to="/teacher/modules"
          className="rounded-xl border border-border bg-card p-6 hover:border-primary"
        >
          <h2 className="font-serif text-lg text-foreground">Modules</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ordered curriculum groups.</p>
        </Link>
        <Link
          to="/teacher/exercises"
          className="rounded-xl border border-border bg-card p-6 hover:border-primary"
        >
          <h2 className="font-serif text-lg text-foreground">Exercises</h2>
          <p className="mt-1 text-sm text-muted-foreground">Author questions, then go live.</p>
        </Link>
      </div>
    </div>
  );
}
