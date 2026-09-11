-- THERE IS NO LEAD PAGE. A ground made for somebody to lead used to wait for them to confirm; now it
-- is open from the moment it is made. Every ground still waiting is opened here, and the lead's
-- first check-in is created where it is missing, so nobody is left on a page with nothing to do.
UPDATE "grounds" g
SET "status" = (CASE
  WHEN EXISTS (SELECT 1 FROM "ground_participants" p WHERE p."ground_id" = g."id" AND p."partyType" = 'PARTICIPANT') THEN 'AWAITING_PARTIES'
  ELSE 'OPEN'
END)::"GroundStatus"
WHERE g."status" = 'AWAITING_LEAD';

INSERT INTO "check_ins" ("id", "ground_id", "participant_id", "session_number", "status", "available_from")
SELECT gen_random_uuid()::text, p."ground_id", p."id", 1, 'NOT_STARTED', g."starts_at"
FROM "ground_participants" p
JOIN "grounds" g ON g."id" = p."ground_id"
WHERE p."partyType" = 'INITIATOR'
  AND NOT EXISTS (SELECT 1 FROM "check_ins" c WHERE c."participant_id" = p."id")
  AND g."status" IN ('OPEN', 'AWAITING_PARTIES')
  AND g."created_at" > now() - interval '120 days';
