-- WHEN A REVIEW FALLS DUE SOMEWHERE ELSE.
--
-- Groundwork does not evaluate anybody and this does not make it start. It is
-- our note of a date held in the customer's own system, so the record this
-- product already produces can arrive BEFORE the conversation rather than after.
--
-- Its own table rather than a column on people: that table mirrors their
-- directory and this is not in their directory, and a date needs to say where it
-- came from.
CREATE TABLE "evaluations_due" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "person_external_id" TEXT NOT NULL,
  "due_on" DATE NOT NULL,
  "kind" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "notified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "evaluations_due_pkey" PRIMARY KEY ("id")
);

-- Truncated to 63 characters, which is what Postgres does to an identifier and
-- therefore what Prisma expects to find. Written out rather than left to the
-- truncation, so the schema and the migration agree.
CREATE UNIQUE INDEX "evaluations_due_organization_id_person_external_id_due_on_k_key"
  ON "evaluations_due"("organization_id", "person_external_id", "due_on", "kind");
CREATE INDEX "evaluations_due_organization_id_due_on_notified_at_idx"
  ON "evaluations_due"("organization_id", "due_on", "notified_at");

ALTER TABLE "evaluations_due"
  ADD CONSTRAINT "evaluations_due_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
