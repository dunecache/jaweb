import { gradingSettingsSchema, gradingTestResultSchema, type ProviderName } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { ErrorState, LoadingState } from "@/components/app/data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { settingsKey, useGradingSettings } from "@/lib/grading-queries";

const CLOUD: ProviderName[] = ["google", "opencode", "openai", "anthropic", "openrouter"];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useGradingSettings();
  const [provider, setProvider] = useState<ProviderName>("google");
  const [model, setModel] = useState("gemini-2.5-flash-lite");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: settingsKey });
  const save = useMutation({
    mutationFn: () =>
      apiRequest(
        "/teacher/settings/grading",
        {
          method: "PATCH",
          body: JSON.stringify({
            provider,
            model,
            apiKey: apiKey || undefined,
            baseUrl: baseUrl || null,
          }),
        },
        gradingSettingsSchema,
      ),
    onSuccess: () => {
      setApiKey("");
      invalidate();
    },
  });
  const test = useMutation({
    mutationFn: () =>
      apiRequest("/teacher/settings/grading/test", { method: "POST" }, gradingTestResultSchema),
    onSuccess: invalidate,
  });

  if (settings.isPending) return <LoadingState label="Loading grading settings" />;
  if (settings.isError) {
    return (
      <ErrorState message="Could not load settings." onRetry={() => void settings.refetch()} />
    );
  }
  const current = settings.data;
  const activeProvider = provider;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <div className="max-w-[720px] space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Grading settings</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Pick a provider and model. The change takes effect on the next submission.
        </p>
      </div>

      {current.source === "none" ? (
        <p className="rounded-card border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          No grader is configured. Typed answers will need review.
        </p>
      ) : null}
      {CLOUD.includes(activeProvider) ? (
        <p className="rounded-card border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          Cloud grading sends student answers abroad (Law 18-07). Use a local model or secure an
          ANPDP authorization before enabling it.
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-card border border-hairline bg-surface p-6"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            className="h-9 rounded-input border border-hairline bg-surface px-3 text-sm"
            value={provider}
            onChange={(event) => setProvider(event.target.value as ProviderName)}
          >
            {["google", "opencode", "openai", "anthropic", "openrouter", "ollama", "fake"].map(
              (name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="api-key">API key</Label>
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              current.apiKeyLast4 ? `Saved key •••• ${current.apiKeyLast4}` : "Paste a key"
            }
            autoComplete="off"
          />
          <p className="text-xs text-ink-muted">
            Keys are encrypted at rest and never shown in full.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="base-url">Base URL (optional)</Label>
          <Input
            id="base-url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://localhost:11434"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={save.isPending}>
            Save settings
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => test.mutate()}
            disabled={test.isPending}
          >
            Test connection
          </Button>
        </div>
        {test.data ? (
          <p className={`text-sm ${test.data.ok ? "text-success" : "text-danger"}`} role="status">
            {test.data.ok
              ? `Connected in ${test.data.latencyMs} ms`
              : (test.data.error ?? "Connection failed")}
          </p>
        ) : null}
        {current.testedAt ? (
          <p className="text-xs text-ink-muted">
            Last test: {current.testOk ? "ok" : "failed"} at {current.testedAt}
          </p>
        ) : null}
      </form>
    </div>
  );
}
