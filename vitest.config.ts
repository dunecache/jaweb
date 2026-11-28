import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // WASM-backed DB/Argon2 have a slower first import on Termux than native
    // bindings do on CI; these ceilings keep local runs meaningful.
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
