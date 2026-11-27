import {
  gradingTestResultSchema,
  patchGradingSettingsSchema,
  type TestGradingSettings,
  testGradingSettingsSchema,
} from "@jaweb/shared";
import { Hono } from "hono";
import {
  maskedSettings,
  recordTest,
  saveSettings,
  testProvider,
} from "../../grading/provider-settings";
import type { AppEnv } from "../../lib/app-types";
import { ValidationError } from "../../lib/errors";
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
  const raw: unknown = await c.req.json().catch(() => undefined);
  let draft: TestGradingSettings | undefined;
  if (raw !== undefined) {
    const parsed = testGradingSettingsSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Invalid request");
    draft = parsed.data;
  }
  const result = await testProvider(draft);
  // Only a saved configuration gets a recorded test timestamp.
  if (!draft) await recordTest(result.ok);
  return c.json(gradingTestResultSchema.parse(result));
});
