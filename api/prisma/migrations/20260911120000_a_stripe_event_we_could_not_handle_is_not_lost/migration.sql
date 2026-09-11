-- A STRIPE EVENT WE COULD NOT HANDLE IS NOT LOST. The webhook let any throw become a non-2xx, so a
-- deterministic failure stuck for ever with Stripe retrying and no operator signal. The event is
-- kept here with what went wrong, Stripe is answered 200, and an hourly retry works from this
-- record rather than from Stripe's.
CREATE TABLE "stripe_event_failures" (
  "id"            TEXT NOT NULL,
  "event_id"      TEXT NOT NULL,
  "event_type"    TEXT NOT NULL,
  "error"         TEXT NOT NULL,
  "payload"       JSONB NOT NULL,
  "attempts"      INTEGER NOT NULL DEFAULT 1,
  "last_tried_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at"   TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stripe_event_failures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stripe_event_failures_event_id_key" ON "stripe_event_failures"("event_id");
CREATE INDEX "stripe_event_failures_resolved_at_last_tried_at_idx" ON "stripe_event_failures"("resolved_at", "last_tried_at");
