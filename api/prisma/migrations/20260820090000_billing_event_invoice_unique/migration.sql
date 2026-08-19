-- The Stripe webhook deduped on stripe_invoice_id with a read-then-write and nothing behind it, so
-- two concurrent deliveries of one event could both credit the balance and both log the charge.
-- A partial unique index makes the second insert fail, which the handler now treats as the
-- idempotency signal. NULLs are excluded so the event types that carry no invoice are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "billing_events_stripe_invoice_id_key"
  ON "billing_events" ("stripe_invoice_id")
  WHERE "stripe_invoice_id" IS NOT NULL;
