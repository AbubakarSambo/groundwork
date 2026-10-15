-- WHY A JOB NOBODY OWNS MATTERS (request 25): each note now says which check-in it rests on, so an
-- admin is given it only when they may open that check-in, and what it was built from, so the same
-- record again writes nothing. Both are empty on every note that exists today.
ALTER TABLE "role_gap_notes" ADD COLUMN "ground_id" TEXT;
ALTER TABLE "role_gap_notes" ADD COLUMN "input_key" TEXT;
