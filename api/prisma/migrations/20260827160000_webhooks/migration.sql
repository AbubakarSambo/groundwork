-- Outbound webhooks: where a customer wants to be told, and every attempt we made.
--
-- The secret is stored rather than hashed, unlike an api credential: a credential is verified
-- against a hash, a webhook secret is USED to sign every delivery and so has to be recoverable.
-- Rotation keeps the previous one working for a grace window so there is no downtime.
--
-- Dead letters stay in the table. A dead letter nobody can see is a lost message.

CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'DEAD');

CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "previous_secret" TEXT,
    "rotated_at" TIMESTAMP(3),
    "events" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "webhook_endpoints_organization_id_idx" ON "webhook_endpoints"("organization_id");
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "response_code" INTEGER,
    "response_body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "webhook_deliveries_status_next_attempt_at_idx" ON "webhook_deliveries"("status", "next_attempt_at");
CREATE INDEX "webhook_deliveries_organization_id_created_at_idx" ON "webhook_deliveries"("organization_id", "created_at");
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey"
    FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
