CREATE TABLE "product_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "says" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "as_of" TIMESTAMP(3) NOT NULL,
    "source_system" TEXT NOT NULL,
    "subject_external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_metrics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_metrics_organization_id_key_as_of_key" ON "product_metrics"("organization_id", "key", "as_of");
CREATE INDEX "product_metrics_organization_id_subject_external_id_idx" ON "product_metrics"("organization_id", "subject_external_id");
ALTER TABLE "product_metrics" ADD CONSTRAINT "product_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
