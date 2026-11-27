import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function Skeleton({ className = "h-4" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} aria-hidden="true" />;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  const text = label.endsWith("…") ? label : `${label}…`;
  return (
    <div className="space-y-3" role="status">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      <p>{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6" role="alert">
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
