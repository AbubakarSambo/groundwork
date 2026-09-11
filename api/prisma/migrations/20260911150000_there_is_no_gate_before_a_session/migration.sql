-- THERE IS NO GATE BEFORE A SESSION. The willingness gate asked people in tense situations to agree
-- to two things before being allowed to continue. Its three columns were never written or read by
-- anything; the question itself is gone from the prompt by the product owner's decision, 11
-- September 2026. Nothing about a person is gated on their answer to a question nobody asks.
ALTER TABLE "ground_participants" DROP COLUMN IF EXISTS "willingness_evidence";
ALTER TABLE "ground_participants" DROP COLUMN IF EXISTS "willingness_cadence";
ALTER TABLE "check_ins" DROP COLUMN IF EXISTS "willingness_confirmed";
UPDATE "check_ins" SET "closed_reason" = 'declined' WHERE "closed_reason" = 'willingness_declined';
