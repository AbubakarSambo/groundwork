-- SOMETHING A CHECK-IN ASKED FOR AND DID NOT GET.
--
-- Recorded and let go rather than pressed: a person who feels cornered gives compliant answers, and
-- those are worse than missing ones. It stays open across rounds and closes the moment they answer.
CREATE TABLE "check_in_gaps" (
  "id" TEXT NOT NULL,
  "ground_id" TEXT NOT NULL,
  "participant_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "what" TEXT NOT NULL,
  "asked" INTEGER NOT NULL DEFAULT 1,
  "first_round" INTEGER NOT NULL,
  "answered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "check_in_gaps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "check_in_gaps_participant_id_slug_key" ON "check_in_gaps"("participant_id", "slug");
CREATE INDEX "check_in_gaps_ground_id_answered_at_idx" ON "check_in_gaps"("ground_id", "answered_at");

ALTER TABLE "check_in_gaps" ADD CONSTRAINT "check_in_gaps_ground_id_fkey"
  FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "check_in_gaps" ADD CONSTRAINT "check_in_gaps_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
