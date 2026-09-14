-- A BOARD TARGET CAN BELONG TO ONE PERSON.
--
-- Watched with a real team: a chief of staff set ten targets, one per salesperson, summing to the
-- number committed to the board, and nothing could say which was whose. Null keeps the old meaning
-- - a target for the whole check-in, belonging to nobody in particular - so every existing row is
-- unchanged and correct.
ALTER TABLE "ground_objectives" ADD COLUMN "owner_participant_id" TEXT;

CREATE INDEX "ground_objectives_owner_participant_id_idx" ON "ground_objectives"("owner_participant_id");

ALTER TABLE "ground_objectives"
  ADD CONSTRAINT "ground_objectives_owner_participant_id_fkey"
  FOREIGN KEY ("owner_participant_id") REFERENCES "ground_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
