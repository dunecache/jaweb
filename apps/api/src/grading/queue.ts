import { and, eq, lt } from "drizzle-orm";

import { db } from "../db/client";
import { submissions } from "../db/schema";
import { gradeSubmissionById } from "../services/grading";

const pending: string[] = [];
let draining = false;

export function enqueueGrading(id: string): void {
  pending.push(id);
  void drain();
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  while (pending.length > 0) {
    const id = pending.shift();
    if (!id) continue;
    try {
      await gradeSubmissionById(id);
    } catch {
      // A failed job stays in `grading` and is picked up by stale recovery.
    }
  }
  draining = false;
}

// Crash recovery: rows stuck in `grading` for more than two minutes are re-enqueued.
export async function recoverStaleGrading(): Promise<void> {
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  const rows = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.status, "grading"), lt(submissions.submittedAt, cutoff)));
  for (const row of rows) enqueueGrading(row.id);
}
