-- Removing a webhook endpoint was a hard delete, and deliveries cascade off it, so it took the
-- whole delivery log with it - the only record of what we sent and whether it arrived, which is
-- precisely what a customer asks for after an incident. Removal is now a decision about the
-- future: deliveries stop, the history stays.
ALTER TABLE "webhook_endpoints" ADD COLUMN "removed_at" TIMESTAMP(3);

-- Seven attempts, then DEAD, with a warning in our logs and nothing reaching the customer. This
-- is what stops the notice going out once per dead delivery.
ALTER TABLE "webhook_endpoints" ADD COLUMN "dead_notice_at" TIMESTAMP(3);
