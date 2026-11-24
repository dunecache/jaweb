import { Link, Outlet, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/lib/auth";

export function TeacherLayout() {
  const logout = useLogout();
  const navigate = useNavigate();
  const { data: user } = useMe();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/teacher" className="font-display text-xl font-semibold text-ink">
              Jaweb
            </Link>
            <nav className="flex gap-4 text-sm text-ink-muted" aria-label="Teacher navigation">
              <Link to="/teacher/classes" className="hover:text-ink">
                Classes
              </Link>
              <Link to="/teacher/students" className="hover:text-ink">
                Students
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted">{user?.displayName}</span>
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
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

export function TeacherOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Teacher</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Manage your classes and students. Curriculum authoring arrives in Phase 2.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/teacher/classes"
          className="rounded-card border border-hairline bg-surface p-6 hover:border-accent"
        >
          <h2 className="font-display text-lg text-ink">Classes</h2>
          <p className="mt-1 text-sm text-ink-muted">Sections your exercises will belong to.</p>
        </Link>
        <Link
          to="/teacher/students"
          className="rounded-card border border-hairline bg-surface p-6 hover:border-accent"
        >
          <h2 className="font-display text-lg text-ink">Students</h2>
          <p className="mt-1 text-sm text-ink-muted">Accounts, rosters, and passwords.</p>
        </Link>
      </div>
    </div>
  );
}
