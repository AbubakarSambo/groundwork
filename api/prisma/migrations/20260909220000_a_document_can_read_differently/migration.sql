-- A record line can carry what a document says where it reads differently from what the person said. The line stays theirs.
ALTER TABLE "record_entries" ADD COLUMN "document_says" TEXT;
ALTER TABLE "record_entries" ADD COLUMN "document_says_id" TEXT;
