import type { ExerciseDto } from "@jaweb/shared";
import { Link } from "react-router";

import { LiveDot } from "@/components/app/exercise-status-badge";
import { Button } from "@/components/ui/button";

// The live exercise is the most time-sensitive thing on this page, so it gets
// the only accent treatment and sits above authoring (AGENTS §11).
export function LiveExercisesStrip({
  items,
  classNameOf,
}: {
  items: ExerciseDto[];
  classNameOf: (id: string) => string;
}) {
  if (!items.length) {
    return (
      <section aria-label="Live exercises">
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Nothing is live right now.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Live exercises" className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary/40 bg-card p-4"
        >
          <LiveDot />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary">Live now</p>
            <p dir="auto" className="truncate font-serif text-lg text-foreground">
              {item.title}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{classNameOf(item.classId)}</p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              render={<Link to={`/teacher/exercises/${item.id}/monitor`} />}
              className="shrink-0"
            >
              Open monitor
            </Button>
            <Link
              to={`/teacher/exercises/${item.id}`}
              className="text-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline"
            >
              Open editor
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}
