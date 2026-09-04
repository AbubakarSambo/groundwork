-- CreateEnum
CREATE TYPE "OpsQualifyingStatus" AS ENUM ('INTRODUCED', 'READY', 'QUALIFIED');

-- CreateEnum
CREATE TYPE "OpsUseCaseReadiness" AS ENUM ('UNKNOWN', 'REVIEWING', 'GAP_IDENTIFIED', 'IN_PROGRESS', 'PRODUCT_READY');

-- CreateEnum
CREATE TYPE "OpsDeploymentStage" AS ENUM ('READY_SIGNED', 'SETUP', 'ONBOARDING', 'FIRST_USE', 'LIVE');

-- CreateTable
CREATE TABLE "ops_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "ops_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ops_attributions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "contributor_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_detail" TEXT,
    "introduced_at" TIMESTAMP(3) NOT NULL,
    "qualifying_status" "OpsQualifyingStatus" NOT NULL DEFAULT 'INTRODUCED',
    "qualified_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ops_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_contributor_targets" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_sprint_expectation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ops_contributor_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_client_use_cases" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "expected_workflow" TEXT,
    "category" TEXT,
    "product_readiness" "OpsUseCaseReadiness" NOT NULL DEFAULT 'UNKNOWN',
    "product_gap" TEXT,
    "ux_gap" TEXT,
    "technical_gap" TEXT,
    "owner_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "next_action" TEXT,
    "target_ready_date" TIMESTAMP(3),
    "status_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_client_use_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_deployments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "use_case_id" TEXT,
    "deployment_owner_id" TEXT NOT NULL,
    "product_owner_id" TEXT,
    "technical_owner_id" TEXT,
    "stage" "OpsDeploymentStage" NOT NULL DEFAULT 'READY_SIGNED',
    "start_date" TIMESTAMP(3) NOT NULL,
    "target_live_date" TIMESTAMP(3),
    "actual_live_date" TIMESTAMP(3),
    "onboarding_started_at" TIMESTAMP(3),
    "onboarding_completed_at" TIMESTAMP(3),
    "first_use_at" TIMESTAMP(3),
    "first_result_at" TIMESTAMP(3),
    "blocker_type" TEXT,
    "blocker_summary" TEXT,
    "next_action" TEXT,
    "next_action_owner_id" TEXT,
    "next_action_due_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ops_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ops_attributions_contributor_id_qualifying_status_idx" ON "ops_attributions"("contributor_id", "qualifying_status");

-- CreateIndex
CREATE UNIQUE INDEX "ops_attributions_company_id_contributor_id_key" ON "ops_attributions"("company_id", "contributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "ops_contributor_targets_person_id_period_id_is_sprint_expec_key" ON "ops_contributor_targets"("person_id", "period_id", "is_sprint_expectation");

-- CreateIndex
CREATE INDEX "ops_client_use_cases_product_readiness_idx" ON "ops_client_use_cases"("product_readiness");

-- CreateIndex
CREATE INDEX "ops_deployments_stage_idx" ON "ops_deployments"("stage");

-- CreateIndex
CREATE INDEX "ops_deployments_blocker_type_idx" ON "ops_deployments"("blocker_type");

-- AddForeignKey
ALTER TABLE "ops_attributions" ADD CONSTRAINT "ops_attributions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "ops_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_attributions" ADD CONSTRAINT "ops_attributions_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "ops_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_contributor_targets" ADD CONSTRAINT "ops_contributor_targets_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "ops_people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_contributor_targets" ADD CONSTRAINT "ops_contributor_targets_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "ops_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_client_use_cases" ADD CONSTRAINT "ops_client_use_cases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "ops_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_deployments" ADD CONSTRAINT "ops_deployments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "ops_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_deployments" ADD CONSTRAINT "ops_deployments_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "ops_client_use_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

