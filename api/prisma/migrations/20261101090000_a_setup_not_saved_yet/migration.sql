-- A setup a signed-in lead has not saved yet, kept on the server so it is found from any device (Hafsah's blocker, 31 October 2026).
ALTER TABLE "entry_drafts" ADD COLUMN "unfinished_setup" JSONB;
