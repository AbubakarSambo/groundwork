-- Closing round: a check-in flagged final (same conversation, richer report),
-- and the final report's arc synthesis + deterministic anti-gaming features.
ALTER TABLE "check_ins" ADD COLUMN "is_final" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reports" ADD COLUMN "final_synthesis" JSONB;
ALTER TABLE "reports" ADD COLUMN "arc_signals" JSONB;
