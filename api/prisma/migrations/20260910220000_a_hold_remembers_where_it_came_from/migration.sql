-- A HOLD REMEMBERS WHERE IT CAME FROM. pauseGround stamped pausedAt and nothing else, so nothing
-- could lift the hold without guessing the status to return to. This column carries it. Written
-- when a ground is paused, cleared when it is resumed; null for any ground paused before today.
ALTER TABLE "grounds" ADD COLUMN "paused_from_status" "GroundStatus";

-- A PAUSED GROUND THE 3 AM SWEEP STALLED. The stall cron excluded only terminal statuses, so a held
-- ground past its deadline was written STALLED, which has no exit. That is fixed in code
-- (grounds.cron.ts). This returns any ground it already happened to: stamped as paused, now
-- STALLED, back to PAUSED - still held, as it was, so that a person lifts it rather than a script.
UPDATE "grounds"
SET "status" = 'PAUSED'::"GroundStatus"
WHERE "paused_at" IS NOT NULL
  AND "status" = 'STALLED'
  AND "resolved_at" IS NULL
  AND "closed_at" IS NULL;
