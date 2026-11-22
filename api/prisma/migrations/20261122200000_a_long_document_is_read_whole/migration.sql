-- A long document is read whole (Hafsah, 22 November 2026): one reading of all of it, kept once on the document.
-- One new nullable column; nothing existing changes, and a document that fits one read keeps it empty.
ALTER TABLE "ground_documents" ADD COLUMN "synthesis" TEXT;
