import { randomBytes } from "node:crypto";

// Argon2id is @node-rs/argon2's default algorithm (2 = Argon2id in its const enum,
// which cannot be referenced under verbatimModuleSyntax). OWASP baseline params.
const POLICY = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

// The native binding has no working Android/Termux build (it exits with SIGILL).
// Local dev there uses hash-wasm's Argon2id with the same params and standard
// PHC-encoded strings, so hashes remain portable between the two backends.
// Imports stay dynamic because importing the native package at all loads the
// binding eagerly.
const native = process.platform === "android" ? undefined : await import("@node-rs/argon2");

export async function hashPassword(password: string): Promise<string> {
  if (native !== undefined) return native.hash(password, POLICY);
  const { argon2id } = await import("hash-wasm");
  return argon2id({
    password,
    salt: randomBytes(16),
    parallelism: POLICY.parallelism,
    iterations: POLICY.timeCost,
    memorySize: POLICY.memoryCost,
    hashLength: POLICY.outputLen,
    outputType: "encoded",
  });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  // The encoded hash carries its own parameters, so no policy override is passed.
  if (native !== undefined) return native.verify(passwordHash, password);
  const { argon2Verify } = await import("hash-wasm");
  return argon2Verify({ password, hash: passwordHash });
}
