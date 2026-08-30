CREATE TABLE "acceptance_criteria" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "subject_external_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "met_at" TIMESTAMP(3),
    "met_because" TEXT,
    "met_by_external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "acceptance_criteria_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "acceptance_criteria_organization_id_subject_external_id_ord_key" ON "acceptance_criteria"("organization_id", "subject_external_id", "ordinal");
CREATE INDEX "acceptance_criteria_organization_id_subject_external_id_idx" ON "acceptance_criteria"("organization_id", "subject_external_id");
ALTER TABLE "acceptance_criteria" ADD CONSTRAINT "acceptance_criteria_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
