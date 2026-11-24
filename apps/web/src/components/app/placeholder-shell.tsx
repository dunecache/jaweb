import type { ReactNode } from "react";

export function PlaceholderShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <span className="font-display text-xl font-semibold text-ink">Jaweb</span>
          <span className="rounded-input bg-paper px-3 py-1 text-xs text-ink-muted">{title}</span>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        <div className="mt-8 rounded-card border border-hairline bg-surface p-6">
          {children ?? (
            <p className="text-sm text-ink-muted">This view arrives in a later phase.</p>
          )}
        </div>
      </main>
    </div>
  );
}
