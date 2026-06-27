-- Add sharing flag to ground_participants for individual report sharing
ALTER TABLE "ground_participants" ADD COLUMN "solo_artifact_shared" BOOLEAN NOT NULL DEFAULT false;
