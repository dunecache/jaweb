import {
  type GradingSettings,
  gradingSettingsSchema,
  gradingTestResultSchema,
  type LeaderboardVisibility,
  type ProviderName,
  type TestGradingSettings,
} from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";

import { PasswordInput } from "@/components/app/password-input";
import { useToast } from "@/components/app/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";
import { settingsKey } from "@/lib/grading-queries";

const CLOUD: ProviderName[] = ["google", "opencode", "openai", "anthropic", "openrouter"];
const VISIBILITY: Array<{ value: LeaderboardVisibility; label: string }> = [
  { value: "full", label: "Full ranking" },
  { value: "top10_self", label: "Top 10 + me" },
  { value: "hidden", label: "Hidden" },
];
const selectClass = "h-9 rounded-md border border-border bg-card px-3 text-sm";

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.envelope.error.message : fallback;
}

export function GradingSettingsForm({ settings }: { settings: GradingSettings }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [provider, setProvider] = useState<ProviderName>(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl ?? "");
  const [visibility, setVisibility] = useState<LeaderboardVisibility>(
    settings.leaderboardVisibility,
  );

  // The server payload is the source of truth; refetch after save resets the form.
  useEffect(() => {
    setProvider(settings.provider);
    setModel(settings.model);
    setBaseUrl(settings.baseUrl ?? "");
    setVisibility(settings.leaderboardVisibility);
  }, [settings.provider, settings.model, settings.baseUrl, settings.leaderboardVisibility]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: settingsKey });
  const draft: TestGradingSettings = {
    provider,
    model,
    apiKey: apiKey || undefined,
    baseUrl: baseUrl || null,
  };

  const save = useMutation({
    mutationFn: () =>
      apiRequest(
        "/teacher/settings/grading",
        {
          method: "PATCH",
          body: JSON.stringify({ ...draft, leaderboardVisibility: visibility }),
        },
        gradingSettingsSchema,
      ),
    onSuccess: () => {
      setApiKey("");
      invalidate();
      toast("Grading settings saved.");
    },
    onError: (error) => toast(messageOf(error, "Could not save settings.")),
  });
  const test = useMutation({
    mutationFn: () =>
      apiRequest(
        "/teacher/settings/grading/test",
        {
          method: "POST",
          body: JSON.stringify(draft),
        },
        gradingTestResultSchema,
      ),
    onError: (error) => toast(messageOf(error, "Could not run the connection test.")),
  });

  // A test result for old values is misleading once any draft field changes.
  function change(next: () => void) {
    next();
    test.reset();
  }

  const available = (
    ["google", "opencode", "openai", "anthropic", "openrouter", "ollama"] as ProviderName[]
  ).filter((name) => name !== "ollama" || settings.ollamaAvailable);
  const options = available.includes(provider) ? available : [provider, ...available];

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-6"
    >
      {provider === "fake" ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
          The test provider does not grade real answers. Choose a real provider.
        </p>
      ) : null}
      {CLOUD.includes(provider) ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
          Cloud grading sends student answers abroad (Law 18-07). Use a local model or secure an
          ANPDP authorization before enabling it.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="provider">Provider</Label>
        <select
          id="provider"
          className={selectClass}
          value={provider}
          onChange={(event) => change(() => setProvider(event.target.value as ProviderName))}
        >
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          value={model}
          onChange={(event) => change(() => setModel(event.target.value))}
          placeholder={provider === "fake" ? "Not needed" : "gemini-2.5-flash-lite"}
          required={provider !== "fake"}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="api-key">API key</Label>
        <PasswordInput
          id="api-key"
          value={apiKey}
          onChange={(event) => change(() => setApiKey(event.target.value))}
          placeholder={
            settings.apiKeyLast4 ? `Saved key •••• ${settings.apiKeyLast4}` : "Paste a key"
          }
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to keep the saved key. Keys are encrypted at rest and never shown in full.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="base-url">Base URL (optional)</Label>
        <Input
          id="base-url"
          value={baseUrl}
          onChange={(event) => change(() => setBaseUrl(event.target.value))}
          placeholder="https://api.example.com/v1"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="visibility">Leaderboard visibility</Label>
        <select
          id="visibility"
          className={selectClass}
          value={visibility}
          onChange={(event) =>
            change(() => setVisibility(event.target.value as LeaderboardVisibility))
          }
        >
          {VISIBILITY.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Teachers always see the full board.</p>
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
          {test.isPending ? "Testing..." : "Test connection"}
        </Button>
      </div>
      {test.data ? (
        <p
          className={`text-sm ${test.data.ok ? "text-emerald-700" : "text-destructive"}`}
          role="status"
          aria-live="polite"
        >
          {test.data.ok
            ? `Connected in ${test.data.latencyMs} ms`
            : (test.data.error ?? "Connection failed")}
        </p>
      ) : null}
      {settings.testedAt ? (
        <p className="text-xs text-muted-foreground">
          Last saved-config test: {settings.testOk ? "ok" : "failed"} at {settings.testedAt}
        </p>
      ) : null}
    </form>
  );
}
