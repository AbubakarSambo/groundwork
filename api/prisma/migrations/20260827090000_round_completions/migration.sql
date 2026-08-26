-- A round closing becomes a fact on the server instead of a calculation on the client.
--
-- The rule is unchanged: a round is complete when every participant who is not managing-only has a
-- COMPLETED check-in at that session number. It just lives somewhere the server can act on, and the
-- unique constraint is what makes the event fire once per round rather than once per write.

CREATE TABLE "round_completions" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "participant_count" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_completions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "round_completions_ground_id_round_number_key" ON "round_completions"("ground_id", "round_number");
CREATE INDEX "round_completions_ground_id_idx" ON "round_completions"("ground_id");

ALTER TABLE "round_completions" ADD CONSTRAINT "round_completions_ground_id_fkey"
    FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
