-- GW-EXP-1b: whether the lead has told this person the expectation, on their own account.
-- Nullable, so every existing row keeps its current meaning and nothing is rewritten.
ALTER TABLE "person_objectives" ADD COLUMN "awareness" TEXT;
ALTER TABLE "person_objectives" ADD COLUMN "awareness_detail" TEXT;
