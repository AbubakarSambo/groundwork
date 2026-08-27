-- Machine credentials and idempotency, for customers' systems calling us.
--
-- One credential pair per integration so one can be revoked without killing the others, and only
-- the secret's hash is stored. Idempotency records let a retried push replay its original response
-- rather than happen twice.

CREATE TABLE "api_credentials" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret_hash" TEXT NOT NULL,
    "scopes" TEXT[],
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_credentials_client_id_key" ON "api_credentials"("client_id");
CREATE INDEX "api_credentials_organization_id_idx" ON "api_credentials"("organization_id");

ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_records_organization_id_key_endpoint_key"
    ON "idempotency_records"("organization_id", "key", "endpoint");
CREATE INDEX "idempotency_records_created_at_idx" ON "idempotency_records"("created_at");
