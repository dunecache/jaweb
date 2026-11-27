import type { ExerciseStatus } from "@jaweb/shared";

// Text shades are darkened for AA contrast on the tinted backgrounds; the
// base accent/warning tokens stay bright for dots and borders.
const STATUS_STYLE: Record<ExerciseStatus, string> = {
  draft: "border border-dashed border-border bg-background text-muted-foreground",
  scheduled: "bg-amber-50 text-amber-700",
  live: "bg-primary/10 text-primary",
  closed: "border border-border bg-card text-foreground",
};

const STATUS_LABEL: Record<ExerciseStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live now",
  closed: "Closed",
};

// Decorative only; reduced-motion is handled globally in theme.css.
export function LiveDot() {
  return (
    <span className="relative flex size-2" aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-primary" />
    </span>
  );
}

export function ExerciseStatusBadge({
  status,
  pulse = false,
}: {
  status: ExerciseStatus;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${STATUS_STYLE[status]}`}
    >
      {status === "live" && pulse ? <LiveDot /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
