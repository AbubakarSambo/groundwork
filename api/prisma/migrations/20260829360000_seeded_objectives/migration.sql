-- WHERE AN OBJECTIVE CAME FROM, when it did not come from the conversation.
--
-- Groundwork should start from an agreement the customer's own system already holds rather than
-- making somebody rediscover it. To do that safely it has to be able to tell an agreement somebody
-- else recorded from something said in a check-in - and once the text is written down those two look
-- identical without these columns.
ALTER TABLE "person_objectives" ADD COLUMN "source_system"           TEXT;
ALTER TABLE "person_objectives" ADD COLUMN "external_id"             TEXT;
ALTER TABLE "person_objectives" ADD COLUMN "approved_by_external_id" TEXT;
ALTER TABLE "person_objectives" ADD COLUMN "effective_from"          TIMESTAMP(3);

-- The upsert key. Without it, a customer pushing the same agreement twice collides with the
-- (ground, participant, kind) constraint and gets an error they cannot do anything about.
-- Nullable columns mean rows from conversation are excluded: Postgres treats NULLs as distinct.
CREATE UNIQUE INDEX "person_objectives_ground_id_source_system_external_id_key"
  ON "person_objectives" ("ground_id", "source_system", "external_id");
