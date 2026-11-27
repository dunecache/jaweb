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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <span className="font-serif text-xl font-semibold text-foreground">Jaweb</span>
          <span className="rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">{title}</span>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        <h1 className="font-serif text-3xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          {children ?? (
            <p className="text-sm text-muted-foreground">This view arrives in a later phase.</p>
          )}
        </div>
      </main>
    </div>
  );
}
