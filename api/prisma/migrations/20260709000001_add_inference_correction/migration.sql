-- Add inference tracking to reports
ALTER TABLE "reports" ADD COLUMN "inferences" JSONB;

-- Add clarification session fields to check_ins
ALTER TABLE "check_ins" ADD COLUMN "is_clarification" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "check_ins" ADD COLUMN "clarification_target" TEXT;
