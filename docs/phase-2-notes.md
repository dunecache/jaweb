# Phase 2 — task notes

## Implementation

- New tables: `modules`, `exercises`, `questions` (migration `0002_authoring.sql`, generated
  by drizzle-kit). Exercises default by type: exercise 0.75/0.25 + `immediate`, exam
  0.90/0.10 + `at_close`; speed window 120s from shared scoring constants.
- Teacher-safe full DTOs and a single `studentSafeQuestion` allow-list in `packages/shared`;
  the preview endpoint returns only `id/position/prompt/kind/options/points`.
- `assertReadyForLive()` is the field-level go-live guard; Phase 3's `/live` endpoint calls
  it. The guard is already unit/integration tested (free text without model answer and
  aliases yields 422 issues).
- Live exercises are immutable: question PATCH/DELETE and exercise PATCH reject with 409.
- Archived modules are hidden from normal selection but viewable via `?archived=1`
  with a badge, so history stays intact without polluting authoring flows.

## Verification status

`pnpm typecheck`, `pnpm lint`, `pnpm build` pass locally. `tests/phase2.test.ts`
(guards, preview leak check, archive behavior, immutability, role matrix) must be
confirmed by Linux CI due to the sandbox's missing libSQL/argon2 native support.
