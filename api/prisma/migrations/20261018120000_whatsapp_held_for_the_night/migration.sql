-- A WHATSAPP MESSAGE HELD FOR THE NIGHT (release plan Part 0: quiet hours end at 7am in the organisation's time zone).
-- Add-only; the statements can be run again. Nothing already there is read, changed or removed.
CREATE TABLE IF NOT EXISTS "scheduled_whatsapp_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "phone" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "context" JSONB,
    "not_before" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_whatsapp_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "scheduled_whatsapp_messages_sent_at_not_before_idx" ON "scheduled_whatsapp_messages"("sent_at", "not_before");
