-- An objective per person, and a baseline recorded on purpose. (G13, G14)
--
-- Additive only. Nothing existing changes meaning, so OBJECTIVES_ENABLED off is
-- the old product: one success definition belonging to the lead, and the arc
-- inferred from session 1 as it is today.
--
-- person_objectives carries authored_by and seen_by_subject because a proposal
-- nobody has seen is never read against, and those two columns are what make
-- that arithmetic rather than an instruction in a prompt.
--
-- ground_baseline_entries deliberately has no updated_at. A baseline that can be
-- corrected stops being a baseline: half the findings this product makes are the
-- distance between what people believed at the start and what turned out to be
-- true. A correction goes in as a new row with its own date.

CREATE TABLE "person_objectives" (
  "id"              TEXT NOT NULL,
  "ground_id"       TEXT NOT NULL,
  "participant_id"  TEXT NOT NULL,
  "text"            TEXT NOT NULL,
  "authored_by"     TEXT NOT NULL,
  "seen_by_subject" BOOLEAN NOT NULL DEFAULT false,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "person_objectives_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "person_objectives_ground_id_participant_id_key"
  ON "person_objectives"("ground_id", "participant_id");

ALTER TABLE "person_objectives"
  ADD CONSTRAINT "person_objectives_ground_id_fkey"
  FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "person_objectives"
  ADD CONSTRAINT "person_objectives_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ground_baseline_entries" (
  "id"                  TEXT NOT NULL,
  "ground_id"           TEXT NOT NULL,
  "text"                TEXT NOT NULL,
  "captured_at_session" INTEGER NOT NULL,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ground_baseline_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ground_baseline_entries_ground_id_created_at_idx"
  ON "ground_baseline_entries"("ground_id", "created_at");

ALTER TABLE "ground_baseline_entries"
  ADD CONSTRAINT "ground_baseline_entries_ground_id_fkey"
  FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
