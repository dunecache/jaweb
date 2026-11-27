# Phase 4 — task notes

## Implementation

- Shared `normalizeText`/`aliasesMatch` implement §9.3 (Arabic tashkeel, tatweel,
  alef/ta-marbuta/alef-maqsura unification; French accents; punctuation).
- `GradeProvider` adapters: `google`, `opencode`/`openai`/`openrouter` (OpenAI-compatible),
  `anthropic`, `ollama`, and `fake`. All use temperature 0, JSON output, and zod
  validation. The fake provider supports scripted responses for retry/injection tests.
- Settings are the `provider_settings` singleton: DB → env → unconfigured; API keys
  AES-256-GCM-encrypted under `SETTINGS_ENC_KEY`, masked to last4, and saving fails
  closed when the key is absent.
- Free-text grading is asynchronous: alias fast path (zero calls), then provider with
  ≤2 retries, confidence < 0.7 → `needs_review`; in-process queue re-enqueues rows
  stuck in `grading` for >2 minutes on boot.
- Teacher override (`graded_by='teacher'`) and unlock-for-retake (archives the old
  submission, leaves a fresh slot) are wired in the review UI.
- §9.5 points are applied to every graded submission via `applyPoints()`.

## Human check still open

The provider/payment decision for Algeria (Google AI Studio free tier → OpenCode
credits → OpenAI; verify payable path and Law 18-07 posture) is reserved to the
human (AGENTS §17); the Settings UI exposes the warning and all providers.

## Verification status

`pnpm typecheck`, `pnpm lint`, `pnpm build`, and normalization unit tests pass
locally. `tests/phase4.test.ts` needs Linux CI for libSQL/argon2-backed assertions.
