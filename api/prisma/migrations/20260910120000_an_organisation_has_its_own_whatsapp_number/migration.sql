-- An organisation connects its own WhatsApp number, and people carry a phone on the roster.
CREATE TABLE "whatsapp_connections" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "phone_number_id" TEXT NOT NULL,
  "business_account_id" TEXT,
  "display_number" TEXT,
  "access_token" TEXT NOT NULL,
  "app_secret" TEXT NOT NULL,
  "verify_token" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_inbound_at" TIMESTAMP(3),
  "last_outbound_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_connections_organization_id_key" ON "whatsapp_connections"("organization_id");
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "people" ADD COLUMN "phone" TEXT;
CREATE INDEX "people_organization_id_phone_idx" ON "people"("organization_id", "phone");
