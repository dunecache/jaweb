# Phase 7 — task notes

- Skeleton primitive now backs all loading states; empty/error states were audited
  across authoring, monitor, review, settings, history, leaderboard and student views.
- Toast system with `aria-live="polite"` for login and submission feedback.
- Adaptive polling already pauses on `document.hidden`; added online/offline banner
  and kept `localStorage` answer drafts keyed by question id.
- Student-facing strings are translated in EN/FR/AR with a persisted locale switcher;
  `<html dir="rtl">` is set for Arabic and free text uses `dir="auto"`.
- Teacher/student route trees are code-split (verified in the Vite build output).
- Favicon, meta description, reduced-motion CSS and focus rings are in place.

## Manual acceptance still owed

Axe/Lighthouse scans, keyboard-only walkthrough, 375px screenshot review and an
Arabic RTL smoke test require a browser; they are not automated in CI until Phase 8.
Optional dark-mode flag not implemented.

Verification: typecheck/lint/build pass locally; CI confirms tests.
