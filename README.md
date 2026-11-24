# Jaweb (جاوب)

Live classroom answers — see `AGENTS.md` for the operating manual and `ROADMAP.md`
for the build plan. This repository is at Phase 0 (Foundations).

## Quick start

```sh
pnpm install
cp .env.example .env   # then edit secrets
pnpm db:migrate
pnpm dev               # API on :8787, web on :5173
```

Check the API: `curl http://localhost:8787/api/health` → `{"ok":true,"db":"up"}`.

## Scripts

| Command                                                 | Purpose                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| `pnpm dev`                                              | API + Vite dev server                          |
| `pnpm build`                                            | Typecheck + build the SPA into `apps/web/dist` |
| `pnpm typecheck` / `pnpm lint` / `pnpm format`          | Static checks / autofix                        |
| `pnpm test`                                             | Vitest unit + integration                      |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed` | Drizzle workflow                               |
