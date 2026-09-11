-- A FAILURE THE PRODUCT KNOWS ABOUT REACHES A PERSON. A suppressed mail, a bounce, a quiet-hours
-- hold and a failed WhatsApp send were each a log line or nothing. One row per outcome, from the one
-- door mail goes through and the one WhatsApp sends go through.
CREATE TABLE "notifications" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT,
  "channel"         TEXT NOT NULL,
  "to_address"      TEXT NOT NULL,
  "sender"          TEXT,
  "subject"         TEXT,
  "outcome"         TEXT NOT NULL,
  "because"         TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_to_address_created_at_idx" ON "notifications"("to_address", "created_at");
CREATE INDEX "notifications_outcome_created_at_idx" ON "notifications"("outcome", "created_at");
