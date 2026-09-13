-- The screen for this existed and the rule behind it never fired. The reading is the model's now,
-- written when a round closes; the lead still accepts it in one press.
ALTER TABLE "ground_objectives" ADD COLUMN "suggested_count" INTEGER;
ALTER TABLE "ground_objectives" ADD COLUMN "suggested_said" TEXT;
ALTER TABLE "ground_objectives" ADD COLUMN "suggested_at_session" INTEGER;
