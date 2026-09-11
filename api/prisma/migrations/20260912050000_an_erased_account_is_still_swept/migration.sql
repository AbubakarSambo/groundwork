-- AN ERASED ACCOUNT IS STILL SWEPT (fix plan A16). Erasure rewrote a participant link's address to a
-- placeholder, which was the only key the retention sweep matched on, so an erased person's raw
-- turns outlived the window. The link keeps the SHA-256 of the address it had. Rows erased before
-- this column existed have no address left to hash and cannot be backfilled; they are the ones a
-- person with the database should sweep by hand once, matching on the deleted-... placeholder.
ALTER TABLE "ground_participants" ADD COLUMN "erased_from" TEXT;

-- A model call made for nobody signed in is a usage event now (fix plan F13).
ALTER TYPE "UsageEventType" ADD VALUE 'ANONYMOUS_MODEL_CALL';
