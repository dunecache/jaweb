import "dotenv/config";

import { providerNameSchema } from "@jaweb/shared";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default("file:./local.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  LLM_PROVIDER: providerNameSchema.default("fake"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  OLLAMA_URL: z.string().optional(),
  SETTINGS_ENC_KEY: z.string().optional(),
  COOKIE_SECURE: z.enum(["auto", "always", "never"]).default("auto"),
  TEACHER_INITIAL_USERNAME: z.string().optional(),
  TEACHER_INITIAL_PASSWORD: z.string().optional(),
  PORT: z.coerce.number().int().positive().max(65535).default(8787),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
