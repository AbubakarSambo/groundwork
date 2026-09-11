-- NOTHING LANDS AT 3AM, AND NOTHING IS LOST EITHER. Quiet hours were honoured by one sender, which
-- dropped the mail. Every mail we decide to send now asks the one rule, and one refused for the hour
-- is held here with the moment it may go, and sent then.
CREATE TABLE "scheduled_emails" (
  "id"         TEXT NOT NULL,
  "to_address" TEXT NOT NULL,
  "subject"    TEXT NOT NULL,
  "html"       TEXT NOT NULL,
  "sender"     TEXT,
  "context"    JSONB,
  "not_before" TIMESTAMP(3) NOT NULL,
  "sent_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scheduled_emails_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scheduled_emails_sent_at_not_before_idx" ON "scheduled_emails"("sent_at", "not_before");
