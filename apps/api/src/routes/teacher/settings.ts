import { gradingTestResultSchema, patchGradingSettingsSchema } from "@jaweb/shared";
import { Hono } from "hono";
import {
  maskedSettings,
  providerFrom,
  recordTest,
  resolveSettings,
  saveSettings,
} from "../../grading/provider-settings";
import type { AppEnv } from "../../lib/app-types";
import { parseJson } from "../../lib/parse";
import { requireAuth, requireRole } from "../../middleware/auth";

export const teacherSettingsRoutes = new Hono<AppEnv>();

teacherSettingsRoutes.use("*", requireAuth, requireRole("teacher"));

teacherSettingsRoutes.get("/", async (c) => c.json(await maskedSettings()));

teacherSettingsRoutes.patch("/", async (c) => {
  const input = await parseJson(c, patchGradingSettingsSchema);
  return c.json(await saveSettings(input));
});

teacherSettingsRoutes.post("/test", async (c) => {
  const provider = providerFrom(await resolveSettings());
  const result = provider
    ? await provider.test()
    : { ok: false, latencyMs: 0, error: "Grader not configured" };
  await recordTest(result.ok);
  return c.json(gradingTestResultSchema.parse(result));
});
