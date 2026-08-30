-- CreateEnum
CREATE TYPE "EvidenceStrength" AS ENUM ('COMPLETED', 'RECORDED', 'ARRANGED', 'SELF_REPORTED');

-- CreateEnum
CREATE TYPE "InteractionKind" AS ENUM ('VISIT', 'CALL', 'MESSAGE', 'MEETING', 'PROPOSAL', 'TRANSACTION');

-- AlterEnum
ALTER TYPE "SubjectType" ADD VALUE 'COUNTERPARTY';

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "counterparty_external_id" TEXT,
    "kind" "InteractionKind" NOT NULL,
    "strength" "EvidenceStrength" NOT NULL,
    "happened_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "source_system" TEXT NOT NULL,
    "external_id" TEXT,
    "disputed_at" TIMESTAMP(3),
    "disputed_by_id" TEXT,
    "dispute_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interactions_organization_id_person_external_id_happened_at_idx" ON "interactions"("organization_id", "person_external_id", "happened_at");

-- CreateIndex
CREATE INDEX "interactions_organization_id_counterparty_external_id_happe_idx" ON "interactions"("organization_id", "counterparty_external_id", "happened_at");

-- CreateIndex
CREATE UNIQUE INDEX "interactions_organization_id_source_system_external_id_key" ON "interactions"("organization_id", "source_system", "external_id");

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

