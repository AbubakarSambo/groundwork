CREATE TABLE "inbound_messages" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT,
    "from_address" TEXT NOT NULL,
    "from_name" TEXT,
    "to_address" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "read_at" TIMESTAMP(3),
    "read_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inbound_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inbound_messages_provider_id_key" ON "inbound_messages"("provider_id");
CREATE INDEX "inbound_messages_received_at_idx" ON "inbound_messages"("received_at");
