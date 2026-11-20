-- Mail a known team member forwards to their organisation's assistant address.
-- Separate from inbound_messages (the company's own inbox), which is never evidence.
CREATE TABLE "inbound_forwards" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_id" TEXT,
    "user_id" TEXT,
    "provider_id" TEXT,
    "content_hash" TEXT,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "attachments" JSONB,
    "ground_id" TEXT,
    "check_in_id" TEXT,
    "document_ids" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_forwards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inbound_forwards_provider_id_key" ON "inbound_forwards"("provider_id");
CREATE UNIQUE INDEX "inbound_forwards_organization_id_person_id_content_hash_key" ON "inbound_forwards"("organization_id", "person_id", "content_hash");
CREATE INDEX "inbound_forwards_organization_id_from_address_idx" ON "inbound_forwards"("organization_id", "from_address");
