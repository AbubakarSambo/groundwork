-- Decision 136: the reason a person gives for missing their check-ins, which their lead sees beside it.
-- Add-only. Every statement can be run again.
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "missed_reason" TEXT;
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "missed_reason_at" TIMESTAMP(3);
