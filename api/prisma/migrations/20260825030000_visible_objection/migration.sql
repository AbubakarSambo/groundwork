-- GW-EXP-7: a person can object to their own expectation, and the objection is visible.
-- It never changes the expectation; one person still owns that.
ALTER TABLE "person_objectives" ADD COLUMN "objection" TEXT;
ALTER TABLE "person_objectives" ADD COLUMN "objection_at" TIMESTAMP(3);
