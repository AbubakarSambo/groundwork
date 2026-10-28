-- Fix plan, pattern 6: one outbox key per message, claimed before it is sent.
CREATE TABLE "outbox_claims" (
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outbox_claims_pkey" PRIMARY KEY ("key")
);
