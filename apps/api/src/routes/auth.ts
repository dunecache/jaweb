import { loginRequestSchema } from "@jaweb/shared";
import { Hono } from "hono";

import type { AppEnv } from "../lib/app-types";
import { parseJson } from "../lib/parse";
import { clearSessionCookie, readSessionToken } from "../lib/session";
import { requireAuth } from "../middleware/auth";
import { login, logout } from "../services/auth";

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/login", async (c) => {
  const input = await parseJson(c, loginRequestSchema);
  return c.json(await login(c, input));
});

authRoutes.post("/logout", requireAuth, async (c) => {
  const token = readSessionToken(c);
  if (token) await logout(token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAuth, (c) => c.json(c.var.user));
