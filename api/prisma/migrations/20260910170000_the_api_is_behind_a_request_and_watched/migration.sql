-- The API is behind a request that accepts the terms, and every machine call is written down.
ALTER TABLE "api_access_requests" ADD COLUMN "accepted_terms_at" TIMESTAMP(3);
ALTER TABLE "api_access_requests" ADD COLUMN "terms_version" TEXT;

CREATE TABLE "api_calls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_calls_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "api_calls_organization_id_at_idx" ON "api_calls"("organization_id", "at");
CREATE INDEX "api_calls_client_id_at_idx" ON "api_calls"("client_id", "at");

CREATE TABLE "api_usage_flags" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "raised_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleared_at" TIMESTAMP(3),
    CONSTRAINT "api_usage_flags_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "api_usage_flags_organization_id_raised_at_idx" ON "api_usage_flags"("organization_id", "raised_at");
CREATE INDEX "api_usage_flags_cleared_at_raised_at_idx" ON "api_usage_flags"("cleared_at", "raised_at");
