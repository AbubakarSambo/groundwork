-- EVERY WHATSAPP MESSAGE OUT IS WRITTEN DOWN. A reply is composed after the model call and the
-- session decrement, so a send that failed silently was money spent on a message nobody received,
-- and nothing recorded it. One row per outbound, with whether it went.
CREATE TABLE "whatsapp_sends" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT,
  "phone"           TEXT NOT NULL,
  "check_in_id"     TEXT,
  "kind"            TEXT,
  "sent_at"         TIMESTAMP(3),
  "failed_at"       TIMESTAMP(3),
  "status"          INTEGER,
  "error"           TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_sends_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "whatsapp_sends_organization_id_created_at_idx" ON "whatsapp_sends"("organization_id", "created_at");
CREATE INDEX "whatsapp_sends_failed_at_idx" ON "whatsapp_sends"("failed_at");
