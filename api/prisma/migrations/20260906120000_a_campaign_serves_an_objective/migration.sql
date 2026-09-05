-- A CAMPAIGN IS RUN FOR AN OBJECTIVE, AND THE LINK IS A ROW.
--
-- `objective` was a free-text sentence, which is a note about intent rather
-- than a connection: nothing could ask "what are we running for this
-- objective", and a campaign whose objective was written down in March could
-- not be checked against the quarter it was actually running in.
--
-- The sentence stays. It says WHY this campaign serves that objective, which
-- the foreign key cannot say.
--
-- Nullable, because existing campaigns have no objective and inventing one for
-- them would be writing history. New ones are refused without it in the
-- service, where the refusal can be a sentence.
ALTER TABLE "ops_marketing_activities" ADD COLUMN "objective_id" TEXT;

CREATE INDEX "ops_marketing_activities_objective_id_idx" ON "ops_marketing_activities"("objective_id");

ALTER TABLE "ops_marketing_activities"
  ADD CONSTRAINT "ops_marketing_activities_objective_id_fkey"
  FOREIGN KEY ("objective_id") REFERENCES "ops_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
