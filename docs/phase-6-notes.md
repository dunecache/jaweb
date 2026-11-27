# Phase 6 — task notes

- `GET /api/leaderboard` supports `scope=live|all|exercise`, class scoping
  (students pinned to their class), points desc / earlier last submission / username
  tie-breaks, and visibility `full` (teacher) / `top10_self` (default) / `hidden`.
  Visibility is a teacher setting on the `provider_settings` row (`0005_boards.sql`).
- Live `at_close` exercises return activity counts only; points land at close.
- Student history list/detail reveals correct answers and feedback only for
  closed exercises (`revealed` flag on detail questions).
- Boards poll 15s→30s with change tokens and pause on `document.hidden`.

Verification: typecheck/lint/build pass locally; `tests/phase6.test.ts` awaits Linux CI.
