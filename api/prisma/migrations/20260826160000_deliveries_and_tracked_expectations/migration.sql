-- Where an expectation is settled, when its kind is REFERENCE. A pointer and a memory of looking,
-- never a copy of the tracker's state.
ALTER TABLE "person_objectives" ADD COLUMN "tracked_url" TEXT;
ALTER TABLE "person_objectives" ADD COLUMN "last_seen_state" TEXT;
ALTER TABLE "person_objectives" ADD COLUMN "last_seen_at" TIMESTAMP(3);

-- What somebody says they delivered against what was expected of them. Reaches the next session
-- as something to ask about, which is why it carries the same carried_into stamp a note does.
CREATE TABLE "deliveries" (
  "id" TEXT NOT NULL,
  "ground_id" TEXT NOT NULL,
  "participant_id" TEXT NOT NULL,
  "objective_id" TEXT,
  "text" TEXT NOT NULL,
  "evidence" TEXT,
  "carried_into_check_in_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deliveries_ground_id_participant_id_idx" ON "deliveries"("ground_id", "participant_id");

ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_ground_id_fkey"
  FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- SetNull, not Cascade: if the expectation is replaced, what they did still happened.
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_objective_id_fkey"
  FOREIGN KEY ("objective_id") REFERENCES "person_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
