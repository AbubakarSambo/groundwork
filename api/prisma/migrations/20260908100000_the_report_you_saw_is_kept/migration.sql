-- The report a person saw at the end of their session, kept whole on that session.
-- It used to be written into group_participants.session_report's neighbour, solo_artifact,
-- which a background job overwrites, so it did not survive the minute after it was read.
ALTER TABLE "check_ins" ADD COLUMN "session_report" JSONB;
