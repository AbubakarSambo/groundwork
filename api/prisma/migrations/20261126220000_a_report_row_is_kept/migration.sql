-- Every row of a table in a report somebody forwarded, as that version said it, so an item has a history and an age (change 2: report rows on
-- the record). Additive: one new table, nothing else changes. Safe to run again.
CREATE TABLE IF NOT EXISTS "report_rows" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "principal_user_id" TEXT NOT NULL,
  "material_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "table_name" TEXT NOT NULL,
  "row" INTEGER NOT NULL,
  "row_key" TEXT NOT NULL,
  "item" TEXT NOT NULL,
  "owner" TEXT,
  "status" TEXT,
  "note" TEXT,
  "due_on" DATE,
  "fill" TEXT,
  "fields" JSONB NOT NULL,
  "sent_from" TEXT,
  "received_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_rows_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "report_rows_material_id_table_name_row_key" ON "report_rows"("material_id", "table_name", "row");
CREATE INDEX IF NOT EXISTS "report_rows_principal_user_id_row_key_idx" ON "report_rows"("principal_user_id", "row_key");

-- Where she put an item in her brief ("not urgent"), kept on the item's own note so it stays put (change 5). Additive and nullable.
ALTER TABLE "register_notes" ADD COLUMN IF NOT EXISTS "her_bucket" TEXT;
