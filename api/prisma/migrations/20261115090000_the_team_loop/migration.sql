-- The team loop (Fatima, increment 6a). Additive only: who a commitment waits on, what shows it was done, where an answer came from when it was
-- not a reply, and a standing instruction's own settings on the existing job row.
ALTER TABLE "commitments" ADD COLUMN "waiting_on" TEXT;
ALTER TABLE "commitments" ADD COLUMN "proven_by" TEXT;
ALTER TABLE "information_gaps" ADD COLUMN "answered_from" TEXT;
ALTER TABLE "persistent_jobs" ADD COLUMN "details" JSONB NOT NULL DEFAULT '{}';
