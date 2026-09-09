-- A document knows what kind of thing it is, and whether it reads as its uploader described it; a backed line knows what kind of document backs it.
ALTER TABLE "ground_documents" ADD COLUMN "origin" VARCHAR(24);
ALTER TABLE "ground_documents" ADD COLUMN "description_check" JSONB;
ALTER TABLE "record_entries" ADD COLUMN "anchored_origin" VARCHAR(24);
