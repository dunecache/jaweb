import { hash, verify } from "@node-rs/argon2";

// Argon2id is @node-rs/argon2's default algorithm (2 = Argon2id in its const enum,
// which cannot be referenced under verbatimModuleSyntax). OWASP baseline params.
const POLICY = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, POLICY);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  // The encoded hash carries its own parameters, so no policy override is passed.
  return verify(passwordHash, password);
}
