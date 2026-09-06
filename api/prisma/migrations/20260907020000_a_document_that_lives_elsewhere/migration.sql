-- A document that lives somewhere else, recorded rather than read. Its own table
-- so no prompt-assembling read can ever pick up a row with no text in it.
CREATE TABLE "documents_elsewhere" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT,
    "url" TEXT NOT NULL,
    "lives_in" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'OWN',
    "note" TEXT,
    "added_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_elsewhere_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documents_elsewhere_ground_id_participant_id_idx" ON "documents_elsewhere"("ground_id", "participant_id");

ALTER TABLE "documents_elsewhere" ADD CONSTRAINT "documents_elsewhere_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents_elsewhere" ADD CONSTRAINT "documents_elsewhere_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
