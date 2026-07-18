-- Delivery log for outbound email + per-participant mirror of the latest
-- invite delivery status. Populated by the Resend webhook.
CREATE TABLE "email_deliveries" (
    "id" TEXT NOT NULL,
    "resend_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "participant_id" TEXT,
    "ground_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "detail" TEXT,
    "status_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_deliveries_resend_id_key" ON "email_deliveries"("resend_id");
CREATE INDEX "email_deliveries_participant_id_idx" ON "email_deliveries"("participant_id");

ALTER TABLE "ground_participants" ADD COLUMN "invite_delivery_status" TEXT;
