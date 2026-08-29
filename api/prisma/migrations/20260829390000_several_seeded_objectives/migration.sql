-- A PLANNING SYSTEM HOLDS SEVERAL TARGETS FOR ONE PERSON. THE CHECK-IN ENGINE MUST STILL HOLD ONE.
--
-- `(ground_id, participant_id, kind)` is what stops the conversation writing two contradictory
-- expectations for somebody with nothing to say which one holds. That guarantee is worth keeping.
-- It also made an integration impossible: Lovedida genuinely has six targets for one person in a
-- quarter, and the second push failed on a constraint naming three columns their developer has
-- never heard of.
--
-- TWO FIXES WERE WRONG BEFORE THIS ONE.
--
-- Adding a NULLABLE external_id to the key removes the guarantee silently: Postgres treats NULLs as
-- distinct, every conversation-authored row has a NULL external_id, so two of them would both
-- insert. That fixes the integration by breaking the product.
--
-- A PARTIAL INDEX (`WHERE source_system IS NULL`) keeps both and cannot be expressed in Prisma, so
-- schema.prisma and the database can never agree - and this repository already removed exactly such
-- an index, in 20260826180000, for exactly that reason. Reintroducing it would turn the CI check
-- that catches real drift permanently red.
--
-- AN EMPTY STRING IS THE VERSION THAT WORKS. Conversation rows all share '' and stay one-per-kind;
-- seeded rows carry their own id and may be many. Fully expressible, no NULL semantics involved.
UPDATE "person_objectives" SET "external_id" = '' WHERE "external_id" IS NULL;
ALTER TABLE "person_objectives" ALTER COLUMN "external_id" SET DEFAULT '';
ALTER TABLE "person_objectives" ALTER COLUMN "external_id" SET NOT NULL;

DROP INDEX IF EXISTS "person_objectives_ground_id_participant_id_kind_key";
CREATE UNIQUE INDEX "person_objectives_ground_id_participant_id_kind_external_id_key"
  ON "person_objectives" ("ground_id", "participant_id", "kind", "external_id");
