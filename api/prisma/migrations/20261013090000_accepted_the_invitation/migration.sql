-- When somebody accepted their invitation to a check-in (Hafsah, 13 October 2026). Add-only; every statement can be run again.
ALTER TABLE "ground_participants" ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3);

-- Rows already on record: an invitation was accepted where the row has a sign-in AND the record shows
-- they came in: a password or Google sign-in, the welcome seen, or a sign-in or password link made for
-- them (accepting an invitation makes one). A row with no sign-in has not accepted.
UPDATE "ground_participants" p
SET "accepted_at" = p."created_at"
WHERE p."accepted_at" IS NULL
  AND p."user_id" IS NOT NULL
  AND p."partyType" <> 'INITIATOR'
  AND (
    EXISTS (SELECT 1 FROM "users" u WHERE u."id" = p."user_id" AND (u."password_hash" IS NOT NULL OR u."google_id" IS NOT NULL OR u."welcome_card_seen_at" IS NOT NULL))
    OR EXISTS (SELECT 1 FROM "email_verification_tokens" t WHERE t."user_id" = p."user_id")
  );

-- And anybody who has already answered in a check-in has come in, whatever way they did (a link, WhatsApp),
-- so no existing person who took part is ever read as "invited, not joined yet".
UPDATE "ground_participants" p
SET "accepted_at" = p."created_at"
WHERE p."accepted_at" IS NULL
  AND EXISTS (
    SELECT 1 FROM "check_ins" c JOIN "conversation_turns" ct ON ct."check_in_id" = c."id"
    WHERE c."participant_id" = p."id" AND ct."role" = 'PERSON'
  );
