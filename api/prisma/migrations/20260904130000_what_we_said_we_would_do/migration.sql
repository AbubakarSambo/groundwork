-- CreateEnum
CREATE TYPE "OpsObjectiveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ACHIEVED', 'MISSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OpsCommitmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'MISSED');

-- CreateEnum
CREATE TYPE "OpsTodoStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "ops_objectives" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "workstream_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "status" "OpsObjectiveStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_key_results" (
    "id" TEXT NOT NULL,
    "objective_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "target_value" DECIMAL(14,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "start_value" DECIMAL(14,2),
    "current_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "measurement_source" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "OpsObjectiveStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "ops_key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_commitments" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "operating_period_id" TEXT NOT NULL,
    "workstream_id" TEXT,
    "linked_objective_id" TEXT,
    "linked_key_result_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "measure_type" TEXT NOT NULL,
    "target_value" DECIMAL(14,2),
    "unit" TEXT,
    "start_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "current_value" DECIMAL(14,2),
    "status" "OpsCommitmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocker_reason" TEXT,
    "measurement_source" TEXT NOT NULL,
    "actual_result" TEXT,
    "evidence_url" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_commitment_links" (
    "id" TEXT NOT NULL,
    "commitment_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,

    CONSTRAINT "ops_commitment_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_todos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "due_date" DATE,
    "status" "OpsTodoStatus" NOT NULL DEFAULT 'OPEN',
    "related_record_type" TEXT,
    "related_record_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ops_todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ops_objectives_period_id_status_idx" ON "ops_objectives"("period_id", "status");

-- CreateIndex
CREATE INDEX "ops_commitments_owner_id_operating_period_id_idx" ON "ops_commitments"("owner_id", "operating_period_id");

-- CreateIndex
CREATE INDEX "ops_commitments_status_due_date_idx" ON "ops_commitments"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "ops_commitment_links_commitment_id_target_type_target_id_key" ON "ops_commitment_links"("commitment_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "ops_todos_owner_id_status_idx" ON "ops_todos"("owner_id", "status");

-- AddForeignKey
ALTER TABLE "ops_key_results" ADD CONSTRAINT "ops_key_results_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "ops_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_commitment_links" ADD CONSTRAINT "ops_commitment_links_commitment_id_fkey" FOREIGN KEY ("commitment_id") REFERENCES "ops_commitments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

