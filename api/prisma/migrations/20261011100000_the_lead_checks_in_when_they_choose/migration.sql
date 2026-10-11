-- Decision 133: the lead checks in when they choose, and the product records when a lead reads a report.
-- Add-only. Every statement can be run again.

-- A lead's check-ins are optional: a session they skip is never counted as missed.
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "optional" BOOLEAN NOT NULL DEFAULT false;
-- Mark the check-ins the leads already have, so the data says so without a join.
UPDATE "check_ins" SET "optional" = true
WHERE "optional" = false
  AND "participant_id" IN (SELECT "id" FROM "ground_participants" WHERE "partyType" = 'INITIATOR');

-- When a lead read a report: one row per lead per report.
CREATE TABLE IF NOT EXISTS "report_reads" (
  "id" TEXT NOT NULL,
  "ground_id" TEXT NOT NULL,
  "session_number" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "first_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_reads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "report_reads_ground_id_session_number_user_id_key" ON "report_reads"("ground_id", "session_number", "user_id");
CREATE INDEX IF NOT EXISTS "report_reads_user_id_idx" ON "report_reads"("user_id");
