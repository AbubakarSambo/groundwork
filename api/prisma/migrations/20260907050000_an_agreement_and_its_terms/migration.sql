-- An agreement, its versions and the terms read out of them. A version is never
-- edited: an amendment is a new version, and the old one keeps standing over the
-- period it covered.
CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "says" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agreements_ground_id_idx" ON "agreements"("ground_id");
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agreement_versions" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'being put together',
    "in_force_from" DATE NOT NULL,
    "in_force_to" DATE,
    "agreed_by" TEXT[],
    "document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agreement_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "agreement_versions_agreement_id_number_key" ON "agreement_versions"("agreement_id", "number");
CREATE INDEX "agreement_versions_agreement_id_in_force_from_idx" ON "agreement_versions"("agreement_id", "in_force_from");
ALTER TABLE "agreement_versions" ADD CONSTRAINT "agreement_versions_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agreement_terms" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "says" TEXT NOT NULL,
    "reads" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'read from the document',
    "clause" TEXT,
    "checked_by" TEXT[],
    "read_differently" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agreement_terms_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agreement_terms_version_id_idx" ON "agreement_terms"("version_id");
ALTER TABLE "agreement_terms" ADD CONSTRAINT "agreement_terms_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "agreement_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
