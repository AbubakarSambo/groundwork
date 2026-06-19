-- CreateEnum
CREATE TYPE "ReportActivationStatus" AS ENUM ('PENDING', 'ACTIVATED');

-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('GROUND_CREATED', 'CHECK_IN_STARTED', 'CHECK_IN_COMPLETED', 'REPORT_REQUESTED', 'REPORT_RELEASED', 'BILLING_ACTIVATED', 'PARTICIPANT_INVITED', 'PARTICIPANT_ACCEPTED', 'ORG_CREATED', 'SUBSCRIPTION_STARTED', 'SUBSCRIPTION_CANCELLED');

-- AlterTable
ALTER TABLE "grounds" ADD COLUMN     "brief" TEXT,
ADD COLUMN     "resolution_state" TEXT;

-- CreateTable
CREATE TABLE "report_activations" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "status" "ReportActivationStatus" NOT NULL DEFAULT 'PENDING',
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "ground_id" TEXT,
    "participant_id" TEXT,
    "user_id" TEXT,
    "type" "UsageEventType" NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_activations_ground_id_idx" ON "report_activations"("ground_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_activations_ground_id_participant_id_key" ON "report_activations"("ground_id", "participant_id");

-- CreateIndex
CREATE INDEX "usage_events_organization_id_idx" ON "usage_events"("organization_id");

-- CreateIndex
CREATE INDEX "usage_events_ground_id_idx" ON "usage_events"("ground_id");

-- CreateIndex
CREATE INDEX "usage_events_type_created_at_idx" ON "usage_events"("type", "created_at");

-- AddForeignKey
ALTER TABLE "report_activations" ADD CONSTRAINT "report_activations_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_activations" ADD CONSTRAINT "report_activations_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
