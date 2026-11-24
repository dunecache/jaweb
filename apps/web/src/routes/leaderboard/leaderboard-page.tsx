import type { Leaderboard } from "@jaweb/shared";
import { useState } from "react";

import { ErrorState, LoadingState } from "@/components/app/data-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMe } from "@/lib/auth";
import { LocaleSwitcher, useI18n } from "@/lib/i18n";
import { usePolledQuery } from "@/lib/polling";

export function LeaderboardPage() {
  const me = useMe();
  const { t } = useI18n();
  const [scope, setScope] = useState<"live" | "all">("all");
  const board = usePolledQuery<Leaderboard>(
    ["leaderboard", scope],
    `/leaderboard?scope=${scope}`,
    15_000,
    30_000,
  );

  if (me.isPending || board.isPending) return <LoadingState label="Loading leaderboard" />;
  if (board.isError) {
    return (
      <ErrorState message="Could not load the leaderboard." onRetry={() => void board.refetch()} />
    );
  }
  const data = board.data;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Leaderboard</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {me.data?.role === "teacher" ? "All students in the class" : "Your class"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {(["all", "live"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setScope(option)}
              className={`rounded-button border px-3 py-2 text-sm ${
                scope === option
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-hairline bg-surface text-ink-muted"
              }`}
            >
              {t(option === "all" ? "allTime" : "live")}
            </button>
          ))}
        </div>
      </div>

      {data.activityOnly ? (
        <p className="rounded-card border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          Points appear when this exercise closes. Activity counts are shown for now.
        </p>
      ) : null}

      {data.visibility === "hidden" && me.data?.role !== "teacher" ? (
        <p className="rounded-card border border-hairline bg-surface p-6 text-sm text-ink-muted">
          {t("leaderboardHidden")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("rank")}</TableHead>
                <TableHead>{t("student")}</TableHead>
                <TableHead className="text-right">{t("points")}</TableHead>
                <TableHead className="text-right">Graded</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entries.map((entry) => (
                <TableRow
                  key={entry.studentId}
                  className={entry.isSelf ? "bg-accent/5" : undefined}
                >
                  <TableCell className="font-mono text-sm">{entry.rank}</TableCell>
                  <TableCell>
                    <span dir="auto">{entry.displayName}</span>
                    <span className="ml-2 font-mono text-xs text-ink-muted">{entry.username}</span>
                    {entry.isSelf ? <span className="ml-2 text-xs text-accent">you</span> : null}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {data.activityOnly ? "—" : entry.points}
                  </TableCell>
                  <TableCell className="text-right text-ink-muted">{entry.gradedCount}</TableCell>
                  <TableCell className="text-right text-ink-muted">
                    {entry.pendingCount > 0 ? (
                      <span className="rounded-input bg-accent/10 px-2 py-0.5 text-xs text-accent">
                        {entry.pendingCount} grading
                      </span>
                    ) : (
                      0
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
