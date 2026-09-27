-- CUSTOMERS AND DEALS (U.17, E9). One new table, empty until the engine writes it: where each customer
-- stands, in a few plain words, from the sales check-ins. The customers themselves stay subjects, and
-- nothing existing is altered.
CREATE TABLE "customer_standings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "counterparty_external_id" TEXT NOT NULL,
    "says" VARCHAR(300) NOT NULL,
    "prompt_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_standings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_standings_organization_id_counterparty_external_id_idx" ON "customer_standings"("organization_id", "counterparty_external_id", "created_at");

ALTER TABLE "customer_standings" ADD CONSTRAINT "customer_standings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

