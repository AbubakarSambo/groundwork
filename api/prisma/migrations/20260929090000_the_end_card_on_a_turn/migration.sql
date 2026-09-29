-- Task 2.7: the check-in's end card. Adds two nullable columns; changes no data.
ALTER TABLE "conversation_turns" ADD COLUMN "end_card" JSONB;
ALTER TABLE "conversation_turns" ADD COLUMN "record_draft" JSONB;
