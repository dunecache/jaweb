import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Workspace scripts run from different directories: `pnpm --filter` uses the
// package dir while `pnpm db:*` runs from the repo root. Anchor dev-only paths
// to the repo root so every entry point shares one .env and one local DB.
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export function resolveDatabaseUrl(url: string): string {
  if (url.startsWith("file:./") || url.startsWith("file:../")) {
    return `file:${resolve(repoRoot, url.slice("file:".length))}`;
  }
  return url;
}
