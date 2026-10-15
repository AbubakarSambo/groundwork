-- The id Meta gave a message Groundwork sent (decision 106 item 1). A reply to an opening notice carries
-- that id as its context, so the reply goes straight to the check-in the notice was about. Nullable:
-- every send before this has none, and a send that did not go has none.
ALTER TABLE "whatsapp_sends" ADD COLUMN "provider_message_id" TEXT;
CREATE INDEX "whatsapp_sends_provider_message_id_idx" ON "whatsapp_sends"("provider_message_id");
