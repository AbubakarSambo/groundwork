-- A promise made in a check-in is a row, and saying it again lands on the row that is there.
--
-- `ground_commitments.source` has carried the value CHECK_IN in its own comment since the table was
-- made, and nothing ever wrote one: six live check-ins by a consultant who promised the same meeting
-- every fortnight produced zero rows. `said_again_in` is what makes the repetition a fact rather
-- than a feeling - the session numbers he said it in, on the one row.
ALTER TABLE "ground_commitments" ADD COLUMN IF NOT EXISTS "stated_in_session" INTEGER;
ALTER TABLE "ground_commitments" ADD COLUMN IF NOT EXISTS "said_again_in" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
