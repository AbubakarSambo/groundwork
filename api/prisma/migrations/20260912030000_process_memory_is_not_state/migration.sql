-- PROCESS MEMORY IS NOT STATE. The Google sign-in exchange code lived in a Map inside one API
-- process, so a restart or a second instance broke sign-in with "Invalid or expired exchange code".
-- It is a row now: written by the callback, deleted on redemption, pruned daily once past expiry.
CREATE TABLE "oauth_exchange_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_exchange_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "oauth_exchange_codes_code_key" ON "oauth_exchange_codes"("code");
CREATE INDEX "oauth_exchange_codes_expires_at_idx" ON "oauth_exchange_codes"("expires_at");
