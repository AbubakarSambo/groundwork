-- RELEASE 2, PULL REQUEST 1 OF 3: THE SWITCHBOARD FOUNDATION AND COLLECTIONS (release plan, Release 2). Add-only; every
-- statement can be run again.
--
-- What it does to rows already there: nothing that changes how they read or behave.
--  - One new value, COLLECTIONS, is added to the list a check-in's scenario may be. Adding a value to an enum is add-only:
--    no existing check-in holds it, none is changed to it, and every existing value keeps its meaning.
--  - Every organisation gets release_2_collections_on = false (off), and bill_word = null (read as "invoice").
--  - Every check-in gets check_in_type = null and check_in_type_confirmed_at = null. An existing check-in's type is read
--    from its own record each time it is read; nothing writes these two columns except the lead confirming a type in
--    "What it is" while the organisation's switch is on.
-- No check-in, setting, cadence, report or person is read, changed or removed.
ALTER TYPE "GroundScenario" ADD VALUE IF NOT EXISTS 'COLLECTIONS';

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_2_collections_on" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bill_word" TEXT;

ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "check_in_type" TEXT;
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "check_in_type_confirmed_at" TIMESTAMP(3);
