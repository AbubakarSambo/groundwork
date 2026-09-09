-- Coaching keeps every observation so a step waits for recurrence; a record line can name the document that backs it.
ALTER TABLE "coaching_states" ADD COLUMN "observations" JSONB;
ALTER TABLE "record_entries" ADD COLUMN "anchored_document_id" TEXT;
