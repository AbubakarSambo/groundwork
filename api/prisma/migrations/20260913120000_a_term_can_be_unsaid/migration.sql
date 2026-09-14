-- "That is not what I said", for a term. The record has had this press since nine model
-- extractors started writing rows; a term read out of a document, and an understanding taken off
-- a transcript, had no equivalent. Marked, never deleted.
ALTER TABLE "agreement_terms" ADD COLUMN "disputed_at" TIMESTAMP(3);
ALTER TABLE "agreement_terms" ADD COLUMN "disputed_by" TEXT;
