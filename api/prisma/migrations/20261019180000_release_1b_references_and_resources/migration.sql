-- RELEASE 1B, PULL REQUEST 2 OF 3: REFERENCES AND RESOURCES (Hafsah, 18 October 2026). Add-only; every statement can be
-- run again.
--
-- What it does to rows already there: nothing. Six new kinds of line are added to the list a check-in's context line may
-- be (what a stage needs, coaching, a risk to watch for, a key fact, the lead's note on a person, and what to help them
-- with); no existing line changes kind, and the old Context page never asks for the new kinds. One new table keeps proof
-- added in a check-in, filed on its item; it starts empty, and is only written while an organisation's Release 1B switch
-- is on (off for every organisation). No check-in, document, line or setting is read, changed or removed.
ALTER TYPE "ContextItemKind" ADD VALUE IF NOT EXISTS 'STAGE_NEEDS';
ALTER TYPE "ContextItemKind" ADD VALUE IF NOT EXISTS 'COACHING';
ALTER TYPE "ContextItemKind" ADD VALUE IF NOT EXISTS 'RISK';
ALTER TYPE "ContextItemKind" ADD VALUE IF NOT EXISTS 'KEY_FACT';
ALTER TYPE "ContextItemKind" ADD VALUE IF NOT EXISTS 'PERSON_NOTE';
ALTER TYPE "ContextItemKind" ADD VALUE IF NOT EXISTS 'HELP_WITH';

CREATE TABLE IF NOT EXISTS "item_evidence" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "participant_id" TEXT,
    "work_item_id" TEXT,
    "item_name" TEXT,
    "read_as" TEXT NOT NULL,
    "counts_as_proof" BOOLEAN NOT NULL DEFAULT false,
    "shows" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "item_evidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "item_evidence_document_id_key" ON "item_evidence"("document_id");
CREATE INDEX IF NOT EXISTS "item_evidence_ground_id_created_at_idx" ON "item_evidence"("ground_id", "created_at");
CREATE INDEX IF NOT EXISTS "item_evidence_work_item_id_idx" ON "item_evidence"("work_item_id");
DO $$ BEGIN
  ALTER TABLE "item_evidence" ADD CONSTRAINT "item_evidence_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "item_evidence" ADD CONSTRAINT "item_evidence_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ground_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
