-- The secret Groundwork signs its webhooks with, handed over when we registered
-- where to send them. Ours to check against; it never leaves this side.
ALTER TABLE "ops_integration" ADD COLUMN "webhook_secret" TEXT;
