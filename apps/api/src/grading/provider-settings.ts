import {
  type GradingSettings,
  type GradingTestResult,
  gradingTestResultSchema,
  type PatchGradingSettings,
  type ProviderName,
  type TestGradingSettings,
} from "@jaweb/shared";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { providerSettings } from "../db/schema";
import { env } from "../env";
import { ValidationError } from "../lib/errors";
import { ollamaAvailable } from "../lib/runtime";
import { decryptApiKey, encryptApiKey, last4 } from "./key-crypto";
import type { GradeProvider } from "./provider";
import { fakeProvider } from "./providers/fake";
import { httpProvider } from "./providers/http";

export type ResolvedSettings = {
  source: "db" | "env" | "none";
  provider: ProviderName;
  model: string;
  apiKey: string | null;
  baseUrl: string | null;
};

const SETTINGS_ID = "grading";

export async function resolveSettings(): Promise<ResolvedSettings> {
  const row = await db
    .select()
    .from(providerSettings)
    .where(eq(providerSettings.id, SETTINGS_ID))
    .get();
  if (row) {
    return {
      source: "db",
      provider: row.provider,
      model: row.model,
      apiKey: row.apiKeyCiphertext ? decryptApiKey(row.apiKeyCiphertext) : null,
      baseUrl: row.baseUrl,
    };
  }
  if (env.LLM_PROVIDER) {
    return {
      source: "env",
      provider: env.LLM_PROVIDER,
      model: env.LLM_MODEL ?? "",
      apiKey: env.LLM_API_KEY ?? null,
      baseUrl: env.LLM_PROVIDER === "ollama" ? (env.OLLAMA_URL ?? "http://localhost:11434") : null,
    };
  }
  return { source: "none", provider: "fake", model: "", apiKey: null, baseUrl: null };
}

export async function maskedSettings(): Promise<GradingSettings> {
  const resolved = await resolveSettings();
  const row = await db
    .select()
    .from(providerSettings)
    .where(eq(providerSettings.id, SETTINGS_ID))
    .get();
  return {
    provider: resolved.provider,
    model: resolved.model,
    apiKeyLast4: row?.apiKeyLast4 ?? null,
    baseUrl: resolved.baseUrl,
    source: resolved.source,
    ollamaAvailable: ollamaAvailable(),
    testedAt: row?.testedAt ?? null,
    testOk: row?.testOk ?? null,
    leaderboardVisibility: row?.leaderboardVisibility ?? "top10_self",
  };
}

export async function saveSettings(input: PatchGradingSettings): Promise<GradingSettings> {
  if (input.provider === "ollama" && !ollamaAvailable()) {
    throw new ValidationError("Local grading with Ollama is not available in this deployment");
  }
  const existing = await db
    .select()
    .from(providerSettings)
    .where(eq(providerSettings.id, SETTINGS_ID))
    .get();
  const ciphertext = input.apiKey
    ? encryptApiKey(input.apiKey)
    : (existing?.apiKeyCiphertext ?? null);
  const lastFour = input.apiKey ? last4(input.apiKey) : (existing?.apiKeyLast4 ?? null);
  await db
    .insert(providerSettings)
    .values({
      id: SETTINGS_ID,
      provider: input.provider,
      model: input.model,
      apiKeyCiphertext: ciphertext,
      apiKeyLast4: lastFour,
      baseUrl: input.baseUrl ?? null,
      testedAt: null,
      testOk: null,
      leaderboardVisibility: input.leaderboardVisibility ?? "top10_self",
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: providerSettings.id,
      set: {
        provider: input.provider,
        model: input.model,
        apiKeyCiphertext: ciphertext,
        apiKeyLast4: lastFour,
        baseUrl: input.baseUrl ?? null,
        testedAt: null,
        testOk: null,
        leaderboardVisibility:
          input.leaderboardVisibility ?? existing?.leaderboardVisibility ?? "top10_self",
        updatedAt: new Date().toISOString(),
      },
    });
  return maskedSettings();
}

export async function recordTest(ok: boolean): Promise<void> {
  await db
    .update(providerSettings)
    .set({ testedAt: new Date().toISOString(), testOk: ok })
    .where(eq(providerSettings.id, SETTINGS_ID));
}

// A provider switch invalidates the old key/base URL; they are provider-specific.
async function resolvedFromDraft(input: TestGradingSettings): Promise<ResolvedSettings> {
  const existing = await resolveSettings();
  const sameProvider = input.provider === existing.provider;
  return {
    source: "db",
    provider: input.provider,
    model: input.model,
    apiKey: input.apiKey ?? (sameProvider ? existing.apiKey : null),
    baseUrl:
      input.baseUrl === undefined
        ? sameProvider
          ? existing.baseUrl
          : null
        : input.baseUrl,
  };
}

export async function testProvider(input?: TestGradingSettings): Promise<GradingTestResult> {
  const resolved = input ? await resolvedFromDraft(input) : await resolveSettings();
  const provider = providerFrom(resolved);
  const result = provider
    ? await provider.test()
    : { ok: false, latencyMs: 0, error: "Grader not configured" };
  return gradingTestResultSchema.parse(result);
}

export function providerFrom(settings: ResolvedSettings): GradeProvider | null {
  if (settings.provider === "ollama" && !ollamaAvailable()) return null;
  if (settings.provider === "fake") return fakeProvider;
  if (!settings.model) return null;
  if (settings.provider !== "ollama" && !settings.apiKey) return null;
  return httpProvider({
    provider: settings.provider,
    model: settings.model,
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
  });
}
