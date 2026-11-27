import { ErrorState, LoadingState } from "@/components/app/data-state";
import { GradingSettingsForm } from "@/components/app/grading-settings-form";
import { useGradingSettings } from "@/lib/grading-queries";

export function SettingsPage() {
  const settings = useGradingSettings();

  if (settings.isPending) return <LoadingState label="Loading grading settings" />;
  if (settings.isError || !settings.data) {
    return (
      <ErrorState message="Could not load settings." onRetry={() => void settings.refetch()} />
    );
  }
  const current = settings.data;

  return (
    <div className="max-w-[720px] space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">Grading settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a provider and model. These apply if automatic grading is re-enabled.
        </p>
      </div>

      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Automatic grading is off for now. Typed answers go to Review for a teacher decision;
        multiple-choice and multi-select still grade instantly.
      </p>
      {current.source === "none" ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
          No grader is configured.
        </p>
      ) : null}
      {!current.ollamaAvailable ? (
        <p className="text-sm text-muted-foreground">
          Local grading with Ollama is not available in this deployment. Choose a cloud provider.
        </p>
      ) : null}

      <GradingSettingsForm settings={current} />
    </div>
  );
}
