-- Somebody asking to join from a broadcast link, before they have proved the
-- address. Nothing is created until the address answers: no account, no
-- participant, no check-in, no session.
CREATE TABLE "pending_joins" (
    "id" TEXT NOT NULL,
    "join_token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role_as_described" TEXT,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_joins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pending_joins_token_key" ON "pending_joins"("token");
CREATE INDEX "pending_joins_join_token_email_idx" ON "pending_joins"("join_token", "email");
