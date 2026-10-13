-- An organisation can have its own time zone (B-094): one new column, empty for every organisation. No existing row is changed.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "time_zone" TEXT;
