-- WHAT THE LEAD DID ABOUT ONE PERSON, FROM THE BOARD (Groundwork does the managing, part 2; Hafsah, 21 October 2026). Add-only; every
-- statement can be run again.
--
-- What it does to rows already there: nothing. It adds one new table, empty, which is filled only when a lead taps praise, start a plan,
-- set a deadline or reassign on a person's part of her board, which is served only where her organisation's direct morning is on. No
-- check-in, report, setting or person is read, changed or removed.
CREATE TABLE IF NOT EXISTS "person_lead_actions" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "by_user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "says" TEXT NOT NULL,
    "item_id" TEXT,
    "to_participant_id" TEXT,
    "due_on" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "person_lead_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "person_lead_actions_ground_id_idx" ON "person_lead_actions"("ground_id");
CREATE INDEX IF NOT EXISTS "person_lead_actions_participant_id_created_at_idx" ON "person_lead_actions"("participant_id", "created_at");
DO $$ BEGIN
  ALTER TABLE "person_lead_actions" ADD CONSTRAINT "person_lead_actions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
