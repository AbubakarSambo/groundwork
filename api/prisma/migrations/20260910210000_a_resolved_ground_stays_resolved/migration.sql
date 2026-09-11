-- A GROUND THAT WAS RESOLVED AND THEN CAME BACK. Releasing the closing session's report set the
-- ground ACTIVE again, seconds after the lead had ended it, and completing that session scheduled
-- another one. Both are fixed in code (grounds/a-ground-that-has-ended.ts). This puts right the
-- ones it already happened to: any ground with a closed resolution is CLOSED, and the sessions
-- left unanswered on it - which nobody can answer now and nobody should be shown - are removed.
UPDATE "grounds" g
SET "status" = 'CLOSED'::"GroundStatus",
    "closed_at" = COALESCE(g."closed_at", r."closed_at"),
    "resolved_at" = COALESCE(g."resolved_at", r."closed_at")
FROM "resolutions" r
WHERE r."ground_id" = g."id"
  AND r."closed_at" IS NOT NULL
  AND g."status" NOT IN ('RESOLVED', 'CLOSED', 'STALLED');

DELETE FROM "check_ins" c
USING "ground_participants" p, "resolutions" r
WHERE c."participant_id" = p."id"
  AND r."ground_id" = p."ground_id"
  AND r."closed_at" IS NOT NULL
  AND c."status" = 'NOT_STARTED';
