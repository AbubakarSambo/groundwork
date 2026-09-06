-- When the lead was told this check-in never started. Set once, so the same
-- names do not arrive every morning.
ALTER TABLE "check_ins" ADD COLUMN "lead_told_at" TIMESTAMP(3);
