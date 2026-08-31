-- TWO PLACES THAT DISAGREED, FOUND BY ASKING POSTGRES.
--
-- Adding `prisma migrate diff --exit-code` to CI failed on its first run, on a drift that had been
-- sitting in the schema for days: `billing_events.stripe_invoice_id` is declared `@unique` in
-- schema.prisma, and the migration that created it made a PARTIAL unique index -
-- `WHERE stripe_invoice_id IS NOT NULL`. Prisma cannot express a partial index, so the two could
-- never agree, and `prisma db push` or a future `migrate dev` would each have produced something
-- different from what production actually runs.
--
-- The partial clause was never doing anything. Postgres treats NULLs as distinct in a unique index
-- by default, so a plain unique index on a nullable column already permits unlimited NULLs - which
-- is exactly what the original comment wanted ("NULLs are excluded so the event types that carry no
-- invoice are unaffected"). Same behaviour, one less disagreement.
--
-- The idempotency guarantee is unchanged: a second delivery of the same invoice still fails to
-- insert, which is what billing.service treats as the signal.
DROP INDEX IF EXISTS "billing_events_stripe_invoice_id_key";

CREATE UNIQUE INDEX "billing_events_stripe_invoice_id_key"
  ON "billing_events" ("stripe_invoice_id");
