import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { LocaleSwitcher, useI18n } from "@/lib/i18n";

export function StudentHeader({ showSkipLink = true }: { showSkipLink?: boolean }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: user } = useMe();
  const [signingOut, setSigningOut] = useState(false);

  const items = [
    { to: "/student", label: t("myExercise"), end: true },
    { to: "/student/history", label: t("history"), end: false },
    { to: "/leaderboard", label: t("leaderboard"), end: false },
  ];

  async function onLogout() {
    setSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="border-b border-border bg-card">
      {showSkipLink ? (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:text-foreground focus:ring-3 focus:ring-ring"
        >
          {t("skipToContent")}
        </a>
      ) : null}
      <div className="mx-auto max-w-[720px] px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
          <Link
            to="/student"
            className="font-serif text-lg font-semibold text-foreground"
            translate="no"
          >
            Jaweb{" "}
            <span className="hidden font-sans text-xs font-normal text-muted-foreground sm:inline">
              جاوب
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              dir="auto"
              className="max-w-[7rem] truncate text-xs text-muted-foreground"
              title={user?.displayName}
            >
              {user?.displayName}
            </span>
            <LocaleSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onLogout()}
              disabled={signingOut}
              aria-label={t("logOut")}
            >
              {signingOut ? `${t("logOut")}…` : t("logOut")}
            </Button>
          </div>
        </div>
        <nav
          aria-label={t("studentNavigation")}
          className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-3 text-sm text-muted-foreground"
        >
          {items.map((item) => {
            const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 border-b-2 pb-0.5",
                  active
                    ? "border-s-primary text-foreground"
                    : "border-transparent hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
