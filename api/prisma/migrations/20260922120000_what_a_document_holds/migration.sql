-- What a document holds, read once at upload, and when the chat said it. See what-a-document-holds.ts.
ALTER TABLE "ground_documents" ADD COLUMN "holds" JSONB;
ALTER TABLE "ground_documents" ADD COLUMN "holds_said_at" TIMESTAMP(3);
