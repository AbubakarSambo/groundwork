-- What somebody said they would do, and whether anybody knows if it happened.
-- Status starts UNKNOWN and is only ever moved by a person; an item with no owner keeps a null
-- participant rather than being attached to the nearest name.
CREATE TABLE "ground_commitments" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT,
    "text" TEXT NOT NULL,
    "outcome" TEXT,
    "when_said" TEXT,
    "explicit" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "source" TEXT NOT NULL DEFAULT 'PASTE',
    "author_user_id" TEXT,
    "carried_into_check_in_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ground_commitments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ground_commitments_ground_id_idx" ON "ground_commitments"("ground_id");
CREATE INDEX "ground_commitments_participant_id_idx" ON "ground_commitments"("participant_id");

ALTER TABLE "ground_commitments" ADD CONSTRAINT "ground_commitments_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ground_commitments" ADD CONSTRAINT "ground_commitments_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
