-- `check_ins.next_commitment` never had a reader or a writer, in the whole history of the repo.
--
-- It is the exact name somebody would look for to answer "what did they say they would do next", so
-- leaving it there is a trap: the next person finds the column, believes the fact is stored, and
-- reads null forever. What they said they would do is a GroundCommitment row with source CHECK_IN,
-- which now exists. This column holds no data because nothing ever put any in it.
ALTER TABLE "check_ins" DROP COLUMN IF EXISTS "next_commitment";
