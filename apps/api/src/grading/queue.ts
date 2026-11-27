import { and, eq, isNotNull, lt } from "drizzle-orm";

import { db } from "../db/client";
import { submissions } from "../db/schema";
import { nowIso } from "../lib/time";

// LLM grading is disabled for now. Rows left in `grading` by an older run are
// routed to the teacher review queue instead of being graded on boot.
export async function recoverStaleGrading(): Promise<void> {
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  await db
    .update(submissions)
    .set({
      status: "needs_review",
      feedback: "Automatic grading is off — needs review.",
      gradedAt: nowIso(),
    })
    .where(
      and(
        eq(submissions.status, "grading"),
        isNotNull(submissions.answer),
        lt(submissions.submittedAt, cutoff),
      ),
    );
}
