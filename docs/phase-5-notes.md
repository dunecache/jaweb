# Phase 5 — task notes

- `GET /api/teacher/exercises/:id/monitor` returns a roster × question status grid,
  aggregates (submitted / grading / needs review / graded / missing), median time,
  a change token and the sub-2s flag list.
- `GET /api/teacher/exercises/:id/export.csv` emits UTF-8 BOM CSV for Excel.
- Monitor UI polls 5s→10s with the shared adaptive polling lib (paused when hidden).
  Teacher submission drill-in reuses the review page and `GET /api/teacher/submissions`.

Verification: typecheck/lint/build pass locally; `tests/phase5.test.ts` awaits Linux CI.
