-- A note somebody wrote down between sessions.
--
-- Deliberately NOT a record_entries row: that table is the record, it feeds the
-- shared report and the other party's context, and a sentence typed between
-- sessions has never been questioned. A note is carried into the next session as
-- something to ASK about; whatever is said under questioning becomes the record
-- through the normal path.
CREATE TABLE "participant_notes" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carried_into_check_in_id" TEXT,

    CONSTRAINT "participant_notes_pkey" PRIMARY KEY ("id")
);

-- The read the session build does: this person's notes not yet picked up.
CREATE INDEX "participant_notes_participant_id_carried_into_check_in_id_idx"
    ON "participant_notes"("participant_id", "carried_into_check_in_id");

ALTER TABLE "participant_notes" ADD CONSTRAINT "participant_notes_ground_id_fkey"
    FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "participant_notes" ADD CONSTRAINT "participant_notes_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
