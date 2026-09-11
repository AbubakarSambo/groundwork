-- A PERCENTAGE THAT CAN ONLY BE ZERO. record_entries.evidenceType had four readers and no writer
-- since its last writer was deleted as a category error, so every row carried the default and the
-- "backed by a document" share was 0% on every report. The share is now read from the columns the
-- anchoring path writes (anchored_document_id, anchored_origin, recall_based); the column and its
-- enum go. No backfill: the columns it is read from were being written all along.
ALTER TABLE "record_entries" DROP COLUMN "evidenceType";
DROP TYPE "EvidenceType";
