-- CreateTable
CREATE TABLE "ops_integration" (
    "id" TEXT NOT NULL DEFAULT 'the-one-row',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "base_url" TEXT,
    "client_id" TEXT,
    "client_secret" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_ok" BOOLEAN,
    "last_sync_summary" TEXT,
    "last_sync_detail" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "ops_integration_pkey" PRIMARY KEY ("id")
);

