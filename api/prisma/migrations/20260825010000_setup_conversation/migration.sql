-- GW-EXP-6: the lead's expectation-setting conversation is not a session.
-- Defaults false, so every existing check-in keeps its current meaning.
ALTER TABLE "check_ins" ADD COLUMN "is_setup" BOOLEAN NOT NULL DEFAULT false;
