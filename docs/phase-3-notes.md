# Phase 3 — task notes

## Implementation

- `participations` and `submissions` tables added in migration `0003_live-loop.sql`.
- `started_at` is first-write-wins via `onConflictDoNothing` on the unique
  `(exercise_id, student_id)` pair; only `last_seen_at` is updated on later views.
- Lazy lifecycle: `syncLifecycle()` runs on student reads and submits, flipping
  scheduled→live and live→closed from `opens_at`/`closes_at` against server time,
  with the per-class single-live check inside the same transaction as the flip.
- Choice answers are graded inline (201 graded); free text is stored as `grading`
  and returns 202 for the Phase 4 queue.
- Student "current" returns only allow-listed question fields plus `serverTime`,
  `closesAt`, own submissions and a `rev` change token (304 on unchanged polls).
- Adaptive polling lib backs off 5s→30s while `rev` is unchanged, pauses on
  `document.hidden`, and refetches on focus.

## Verification status

`pnpm typecheck`, `pnpm lint`, `pnpm build` pass locally. `tests/phase3.test.ts`
(go-live guard, per-class guard, lazy close, speed anchor, instant grading,
resubmission 409, queueing, role matrix) awaits Linux CI confirmation because
native libSQL/argon2 do not run in this sandbox.
