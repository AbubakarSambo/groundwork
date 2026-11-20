-- Batch 2, 7 November 2026. Add-only.
-- Whom a record line is about, when the lead said it about somebody else's work (read by the lead and that person only), and how
-- what was said stands (proved, said, cannot be true), from the conversation's assessment. Null on every row written before.
ALTER TABLE "record_entries" ADD COLUMN "about_participant_id" TEXT;
ALTER TABLE "record_entries" ADD COLUMN "standing" VARCHAR(16);
CREATE INDEX "record_entries_about_participant_id_idx" ON "record_entries"("about_participant_id");
