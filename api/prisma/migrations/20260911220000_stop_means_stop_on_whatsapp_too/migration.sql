-- STOP MEANS STOP ON WHATSAPP TOO, THE WINDOW IS MEASURED PER PERSON, AND A REDELIVERED MESSAGE IS
-- NOT A SECOND ANSWER. A person can end this channel by the means it offers; Meta's 24-hour window
-- is measured from the last time this person wrote; and the message id is claimed before a message
-- is handled, so a redelivery is not another model turn, another answer or another session spent.
ALTER TABLE "people" ADD COLUMN "whatsapp_stopped_at" TIMESTAMP(3);
ALTER TABLE "people" ADD COLUMN "whatsapp_consent_at" TIMESTAMP(3);
ALTER TABLE "people" ADD COLUMN "whatsapp_last_inbound_at" TIMESTAMP(3);
CREATE TABLE "whatsapp_inbound_messages" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "message_id"      TEXT NOT NULL,
  "handled_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_inbound_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_inbound_messages_organization_id_message_id_key" ON "whatsapp_inbound_messages"("organization_id", "message_id");
