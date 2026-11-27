// Vercel Functions set VERCEL=1 at runtime.
export function isVercel(): boolean {
  return process.env.VERCEL === "1";
}

// A Function has no reachable localhost Ollama daemon, so local grading is
// only offered for self-hosted instances.
export function ollamaAvailable(): boolean {
  return !isVercel();
}
