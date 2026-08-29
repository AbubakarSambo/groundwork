-- Stamped once, the first time a handoff crosses the waiting threshold.
-- Nullable and with no backfill: every handoff open today has never been escalated, which is true,
-- and stamping them retroactively would fire the first sweep at all of them at once.
ALTER TABLE "ground_dependencies" ADD COLUMN "escalated_at" TIMESTAMP(3);

-- The sweep asks for open handoffs that have not been escalated yet, oldest first.
CREATE INDEX "ground_dependencies_escalation_idx"
  ON "ground_dependencies" ("status", "escalated_at", "created_at");
