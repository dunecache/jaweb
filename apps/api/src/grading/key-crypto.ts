import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "../env";
import { InternalError } from "../lib/errors";

const ALGORITHM = "aes-256-gcm";

function key(): Buffer {
  const raw = env.SETTINGS_ENC_KEY;
  if (!raw) throw new InternalError("SETTINGS_ENC_KEY is not configured");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32)
    throw new InternalError("SETTINGS_ENC_KEY must be a 32-byte base64 key");
  return decoded;
}

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(":");
}

export function decryptApiKey(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new InternalError("Stored API key is malformed");
  const [iv, tag, encrypted] = parts as [string, string, string];
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function last4(apiKey: string): string {
  return apiKey.slice(-4);
}
