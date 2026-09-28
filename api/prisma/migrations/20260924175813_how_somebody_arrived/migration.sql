-- Whether this person came in through the open link.
--
-- Nothing recorded it, and three different things stood in for it, all wrongly. `invited_at` is set
-- on a link respondent the moment they open it, so "not invited" does not mean "came through the
-- link". The `@unclaimed.invalid` address the link writes is replaced the moment they finish and
-- give a real one. And `user_id IS NULL` is true of an invited participant who has not signed in.
--
-- It matters because readiness asks whether every active party has answered, which cannot be
-- satisfied on a link - the set grows while you count it and the lead never answers - so a report
-- ten people had answered was never marked released, and nobody who asked for it was told.
ALTER TABLE "ground_participants" ADD COLUMN IF NOT EXISTS "came_through_the_link" BOOLEAN NOT NULL DEFAULT false;

-- Recoverable for every row that already exists, from the two things only the link writes:
-- the address it mints before somebody finishes, and the name they type when they do.
UPDATE "ground_participants"
   SET "came_through_the_link" = true
 WHERE "came_through_the_link" = false
   AND ("email" LIKE '%@unclaimed.invalid'
        OR ("user_id" IS NULL AND "name_given" IS NOT NULL));
