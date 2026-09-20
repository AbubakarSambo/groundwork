-- THE DIRECTION IS READ ONCE. A discovery report's direction was computed on every read; with the
-- twenty-four accounts the scenario exists for, the one model call timed out or answered in prose on
-- every read, the page took two minutes, and the direction never appeared. It is read in chunks at
-- release, kept here, and served from here.
ALTER TABLE "reports" ADD COLUMN "direction" JSONB;

-- WHO SAID A TARGET. A target the lead set for somebody and one they set themselves read the same
-- to the conversation, so a rep was asked about "the N4m gap that the opener set as your objective".
ALTER TABLE "ground_objectives" ADD COLUMN "set_by_participant_id" TEXT;
