import { classSchema, type Leaderboard, type LeaderboardEntry } from "@jaweb/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { z } from "zod";

import { ErrorState, Skeleton } from "@/components/app/data-state";
import { StudentHeader } from "@/components/app/student-header";
import { apiRequest } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useExercises } from "@/lib/authoring";
import { cn } from "@/lib/cn";
import { LocaleSwitcher, useI18n } from "@/lib/i18n";
import { usePolledQuery } from "@/lib/polling";

const classListSchema = z.array(classSchema);

type Scope = "all" | "live" | "exercise";

function ScoreboardSkeleton() {
  return (
    <div className="border-t border-foreground/25" aria-hidden="true">
      <div className="grid grid-cols-[3.5rem_1fr_4.5rem] gap-4 border-b border-border py-3">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-8 justify-self-end" />
      </div>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="grid grid-cols-[3.5rem_1fr_4.5rem] gap-4 border-b border-border py-6"
        >
          <Skeleton className={row === 0 ? "h-10 w-8" : "h-4 w-6"} />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-8 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

function ResultRow({
  entry,
  leader,
  activityOnly,
}: {
  entry: LeaderboardEntry;
  leader: boolean;
  activityOnly: boolean;
}) {
  const { t } = useI18n();

  return (
    <tr
      className={cn(
        "border-b border-border",
        leader && "border-s-[3px] border-s-primary bg-primary/[0.04]",
        !leader && entry.isSelf && "bg-primary/[0.03]",
      )}
    >
      {/* The 48px serif rank has a 4px glyph overhang; compensate so it lines up with the name. */}
      <td className={cn("w-16 ps-3 pe-2 pb-5 align-top", leader ? "pt-6" : "pt-5")}>
        {leader ? (
          <span className="font-serif text-5xl leading-none text-primary">{entry.rank}</span>
        ) : (
          <span className="font-mono text-sm text-muted-foreground">{entry.rank}</span>
        )}
      </td>
      <td className="py-5 pe-4 align-top">
        <span
          dir="auto"
          className={cn(
            "block",
            leader
              ? "font-serif text-2xl leading-tight text-foreground"
              : "text-sm font-medium text-foreground",
          )}
        >
          {entry.displayName}
        </span>
        <span dir="auto" className="mt-1 block font-mono text-[11px] text-muted-foreground">
          {entry.username}
          {entry.isSelf ? <span className="ms-2 text-primary">{t("you")}</span> : null}
        </span>
        <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted-foreground sm:hidden">
          <span>
            {entry.gradedCount} {t("graded")}
          </span>
          <span>
            {entry.pendingCount} {t("grading")}
          </span>
        </div>
      </td>
      <td className="py-5 pe-4 text-end align-top">
        {activityOnly ? (
          <>
            <span
              aria-hidden="true"
              className="font-mono text-lg leading-none text-muted-foreground"
            >
              —
            </span>
            <span className="sr-only">{t("pointsHidden")}</span>
          </>
        ) : (
          <span className="font-mono text-lg leading-none tabular-nums text-foreground">
            {entry.points}
          </span>
        )}
      </td>
      <td className="hidden w-24 py-5 pe-4 text-end align-top font-mono text-base tabular-nums text-foreground sm:table-cell">
        {entry.gradedCount}
      </td>
      <td className="hidden w-28 py-5 pe-4 text-end align-top sm:table-cell">
        {entry.pendingCount > 0 ? (
          <span className="inline-flex items-center gap-2 font-mono text-base tabular-nums text-primary">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {entry.pendingCount}
          </span>
        ) : (
          <span className="font-mono text-base text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

// Mounted only for teachers on the exercise scope, so students never hit the
// teacher-only exercises endpoint just by opening the leaderboard.
function ExercisePicker({
  classId,
  exerciseId,
  onExerciseChange,
  onAllExercises,
}: {
  classId: string;
  exerciseId: string;
  onExerciseChange: (id: string) => void;
  onAllExercises: () => void;
}) {
  const { t } = useI18n();
  const exercises = useExercises();
  const classExercises = (exercises.data ?? []).filter((exercise) => exercise.classId === classId);

  // A class switch can leave the chosen exercise behind; drop it so the board
  // never queries an exercise that does not belong to the displayed class.
  useEffect(() => {
    if (!exerciseId || !exercises.data) return;
    const belongsToClass = exercises.data.some(
      (exercise) => exercise.id === exerciseId && exercise.classId === classId,
    );
    if (!belongsToClass) onExerciseChange("");
  }, [classId, exerciseId, exercises.data, onExerciseChange]);

  return (
    <div className="flex flex-wrap items-center gap-3 pt-5">
      <label htmlFor="board-exercise" className="text-sm text-muted-foreground">
        {t("chooseExercise")}
      </label>
      <select
        id="board-exercise"
        value={exerciseId}
        onChange={(event) => {
          if (event.target.value === "__all__") {
            onAllExercises();
          } else {
            onExerciseChange(event.target.value);
          }
        }}
        className="h-9 rounded-md border border-border bg-card px-3 text-sm"
      >
        <option value="">{t("chooseExercise")}</option>
        <option value="__all__">{t("allExercises")}</option>
        {classExercises.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {exercise.title}
          </option>
        ))}
      </select>
    </div>
  );
}

// The query lives in its own component so that the exercise scope with no
// selection never fires a request: the API would silently fall back to an
// all-time board, which would be misleading.
function BoardData({
  scope,
  classId,
  exerciseId,
  teacher,
  backTo,
  mePending,
}: {
  scope: Scope;
  classId: string;
  exerciseId: string;
  teacher: boolean;
  backTo: string;
  mePending: boolean;
}) {
  const { t } = useI18n();
  const exerciseParam =
    scope === "exercise" && exerciseId ? `&exerciseId=${encodeURIComponent(exerciseId)}` : "";
  const board = usePolledQuery<Leaderboard>(
    ["leaderboard", scope, classId, exerciseId],
    `/leaderboard?scope=${scope}${classId ? `&classId=${encodeURIComponent(classId)}` : ""}${exerciseParam}`,
    15_000,
    30_000,
  );

  const data = board.data;
  const hiddenForStudent = data?.visibility === "hidden" && !teacher;

  if (board.isError) {
    return (
      <div className="pt-8">
        <ErrorState message={t("leaderboardLoadError")} onRetry={() => void board.refetch()} />
      </div>
    );
  }
  if (mePending || board.isPending || !data) return <ScoreboardSkeleton />;

  return (
    <div className="pt-8">
      {data.activityOnly ? (
        <p
          role="status"
          className="mb-6 flex items-start gap-3 border-s-2 border-s-amber-600 ps-4 text-sm text-muted-foreground"
        >
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          {t("activityOnlyNotice")}
        </p>
      ) : null}

      {hiddenForStudent || data.entries.length === 0 ? (
        <div className="border-t border-foreground/25 py-16 text-center">
          <p className="font-serif text-xl text-foreground">
            {hiddenForStudent
              ? t("leaderboardHidden")
              : scope === "live" && data.entries.length === 0
                ? t("nothingLive")
                : t("noEntries")}
          </p>
          <Link to={backTo} className="mt-4 inline-block text-sm text-primary hover:text-primary">
            {teacher ? t("dashboard") : t("backToClass")}
          </Link>
        </div>
      ) : (
        <>
          <table className="w-full border-collapse text-start">
            <caption className="sr-only">{t("leaderboard")}</caption>
            <thead>
              <tr className="border-b border-foreground/25">
                <th
                  scope="col"
                  className="w-16 ps-3 pe-2 py-3 text-xs font-medium text-muted-foreground"
                >
                  {t("rank")}
                </th>
                <th scope="col" className="py-3 pe-4 text-xs font-medium text-muted-foreground">
                  {t("student")}
                </th>
                <th
                  scope="col"
                  className="py-3 pe-4 text-end text-xs font-medium text-muted-foreground"
                >
                  {t("points")}
                </th>
                <th
                  scope="col"
                  className="hidden w-24 py-3 pe-4 text-end text-xs font-medium text-muted-foreground sm:table-cell"
                >
                  {t("gradedColumn")}
                </th>
                <th
                  scope="col"
                  className="hidden w-28 py-3 pe-4 text-end text-xs font-medium text-muted-foreground sm:table-cell"
                >
                  {t("pending")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry, index) => (
                <ResultRow
                  key={entry.studentId}
                  entry={entry}
                  leader={index === 0}
                  activityOnly={data.activityOnly}
                />
              ))}
            </tbody>
          </table>
          <p className="mt-6 text-xs text-muted-foreground">{t("boardHint")}</p>
        </>
      )}
    </div>
  );
}

export function LeaderboardPage() {
  const me = useMe();
  const { t } = useI18n();
  const [scope, setScope] = useState<Scope>("all");
  const [classId, setClassId] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const teacher = me.data?.role === "teacher";

  // Students are pinned to their own class by the API; teachers pick which
  // class board they are viewing (the API otherwise defaults to the first one).
  const classes = useQuery({
    queryKey: ["teacher", "classes"],
    queryFn: () => apiRequest("/teacher/classes", undefined, classListSchema),
    enabled: teacher,
  });
  useEffect(() => {
    if (teacher && !classId && classes.data?.length) setClassId(classes.data[0]?.id ?? "");
  }, [teacher, classId, classes.data]);

  const backTo = teacher ? "/teacher" : "/student";
  const scopeOptions: readonly Scope[] = teacher ? ["all", "live", "exercise"] : ["all", "live"];

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:text-foreground focus:ring-3 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>
      {me.data?.role === "student" ? (
        <StudentHeader showSkipLink={false} />
      ) : (
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
            <Link
              to="/"
              className="font-serif text-lg font-semibold text-foreground"
              translate="no"
            >
              Jaweb{" "}
              <span className="font-sans text-xs font-normal text-muted-foreground">جاوب</span>
            </Link>
            <div className="flex items-center gap-4">
              {me.data ? (
                <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground">
                  {teacher ? t("dashboard") : t("backToClass")}
                </Link>
              ) : null}
              <LocaleSwitcher />
            </div>
          </div>
        </header>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1000px] px-5 pb-16 pt-10 sm:px-6 sm:pt-12"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-border pb-7">
          <div>
            <h1 className="font-serif text-[2.5rem] leading-none text-foreground">
              {t("leaderboard")}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {teacher ? t("boardTeacherHint") : t("boardStudentHint")}
            </p>
          </div>
          <fieldset
            aria-label={t("boardScope")}
            className="flex items-center rounded-lg border border-border bg-card p-0.5"
          >
            {scopeOptions.map((option) => {
              const active = scope === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setScope(option)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option === "live" ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        active ? "animate-pulse bg-primary" : "bg-muted-foreground/50",
                      )}
                    />
                  ) : null}
                  {t(
                    option === "all" ? "allTime" : option === "exercise" ? "exerciseScope" : "live",
                  )}
                </button>
              );
            })}
          </fieldset>
        </div>

        {teacher && classes.data?.length ? (
          <div className="flex flex-wrap items-center gap-3 pt-5">
            <label htmlFor="board-class" className="text-sm text-muted-foreground">
              {t("classLabel")}
            </label>
            <select
              id="board-class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm"
            >
              {classes.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {teacher && scope === "exercise" ? (
          <ExercisePicker
            classId={classId}
            exerciseId={exerciseId}
            onExerciseChange={setExerciseId}
            onAllExercises={() => {
              setExerciseId("");
              setScope("all");
            }}
          />
        ) : null}

        {scope === "exercise" && !exerciseId ? (
          <div className="border-t border-foreground/25 py-16 text-center">
            <p className="font-serif text-xl text-foreground">{t("chooseExercise")}</p>
          </div>
        ) : (
          <BoardData
            scope={scope}
            classId={classId}
            exerciseId={exerciseId}
            teacher={teacher}
            backTo={backTo}
            mePending={me.isPending}
          />
        )}
      </main>
    </div>
  );
}
