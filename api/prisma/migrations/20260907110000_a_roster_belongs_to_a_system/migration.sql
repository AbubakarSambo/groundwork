-- A roster belongs to a system, not to a credential. `sourceSystem` was the
-- credential's clientId, which is random on every issue, so rotating a
-- credential duplicated the entire roster on the next sync.
--
-- Existing credentials are backfilled with their own clientId, because that is
-- what their people were already written under: changing it would orphan every
-- row they have ever pushed, which is the same accident in the other direction.
ALTER TABLE "api_credentials" ADD COLUMN "source_system" TEXT;
UPDATE "api_credentials" SET "source_system" = "client_id" WHERE "source_system" IS NULL;
ALTER TABLE "api_credentials" ALTER COLUMN "source_system" SET NOT NULL;
