-- A backed line keeps the document passage that backs it, so a false match is visible rather than watched.
ALTER TABLE "record_entries" ADD COLUMN "anchored_passage" TEXT;
