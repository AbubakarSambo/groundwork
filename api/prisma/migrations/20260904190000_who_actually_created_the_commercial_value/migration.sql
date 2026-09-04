-- CreateEnum
CREATE TYPE "OpsCommercialStage" AS ENUM ('LEAD', 'QUALIFIED', 'DEMO_DISCOVERY', 'PROPOSAL', 'VERBAL_YES', 'PAYING', 'RETAINED_3_MONTH', 'RETAINED_6_MONTH', 'RETAINED_12_MONTH', 'LOST');

-- CreateEnum
CREATE TYPE "OpsPositioningStage" AS ENUM ('TARGET', 'INTRODUCTION', 'MEETING', 'QUALIFIED_ACCESS', 'OPPORTUNITY_CREATED', 'COMMERCIAL_OUTCOME', 'CLOSED');

-- CreateEnum
CREATE TYPE "OpsAttributionState" AS ENUM ('NEEDS_REVIEW', 'CLAIMED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OpsContributionRole" AS ENUM ('POSITIONING_SOURCE', 'OPPORTUNITY_ORIGINATOR');

-- CreateTable
CREATE TABLE "ops_commercial_opportunities" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "opportunity_type" TEXT,
    "stage" "OpsCommercialStage" NOT NULL DEFAULT 'LEAD',
    "positioning_source_id" TEXT,
    "opportunity_originator_id" TEXT,
    "attribution_state" "OpsAttributionState" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "attribution_locked_at" TIMESTAMP(3),
    "positioning_record_id" TEXT,
    "next_action" TEXT,
    "next_action_owner_id" TEXT,
    "next_action_due_at" TIMESTAMP(3),
    "estimated_mrr" DECIMAL(12,2),
    "estimated_contract_value" DECIMAL(14,2),
    "actual_mrr" DECIMAL(12,2),
    "actual_contract_value" DECIMAL(14,2),
    "first_payment_at" TIMESTAMP(3),
    "churned_at" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "evidence_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lost_at" TIMESTAMP(3),
    "lost_reason" TEXT,

    CONSTRAINT "ops_commercial_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_commercial_payments" (
    "id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paid_at" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_commercial_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_attribution_claims" (
    "id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "claimant_id" TEXT NOT NULL,
    "role" "OpsContributionRole" NOT NULL,
    "claimed_basis" TEXT NOT NULL,
    "evidence_url" TEXT,
    "state" "OpsAttributionState" NOT NULL DEFAULT 'CLAIMED',
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "modified_to_person_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_attribution_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_positioning_records" (
    "id" TEXT NOT NULL,
    "contributor_id" TEXT NOT NULL,
    "person_or_network" TEXT NOT NULL,
    "organization" TEXT,
    "access_type" TEXT NOT NULL,
    "stage" "OpsPositioningStage" NOT NULL DEFAULT 'TARGET',
    "opened_at" TIMESTAMP(3) NOT NULL,
    "evidence_url" TEXT,
    "notes" TEXT,
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_positioning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_contributor_agreements" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "agreed_equity_percent" DECIMAL(6,3),
    "proposed_equity_percent" DECIMAL(6,3),
    "equity_pathway_note" TEXT,
    "commitments_note" TEXT,
    "originator_share_percent" DECIMAL(5,2),
    "originator_share_months" INTEGER,
    "agreement_note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "ops_contributor_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ops_commercial_opportunities_stage_idx" ON "ops_commercial_opportunities"("stage");

-- CreateIndex
CREATE INDEX "ops_commercial_opportunities_opportunity_originator_id_stag_idx" ON "ops_commercial_opportunities"("opportunity_originator_id", "stage");

-- CreateIndex
CREATE INDEX "ops_commercial_opportunities_positioning_source_id_idx" ON "ops_commercial_opportunities"("positioning_source_id");

-- CreateIndex
CREATE INDEX "ops_commercial_opportunities_attribution_state_idx" ON "ops_commercial_opportunities"("attribution_state");

-- CreateIndex
CREATE INDEX "ops_commercial_payments_opportunity_id_paid_at_idx" ON "ops_commercial_payments"("opportunity_id", "paid_at");

-- CreateIndex
CREATE INDEX "ops_attribution_claims_state_created_at_idx" ON "ops_attribution_claims"("state", "created_at");

-- CreateIndex
CREATE INDEX "ops_attribution_claims_claimant_id_idx" ON "ops_attribution_claims"("claimant_id");

-- CreateIndex
CREATE INDEX "ops_positioning_records_contributor_id_stage_idx" ON "ops_positioning_records"("contributor_id", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "ops_contributor_agreements_person_id_key" ON "ops_contributor_agreements"("person_id");

-- AddForeignKey
ALTER TABLE "ops_commercial_opportunities" ADD CONSTRAINT "ops_commercial_opportunities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "ops_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_commercial_payments" ADD CONSTRAINT "ops_commercial_payments_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "ops_commercial_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_attribution_claims" ADD CONSTRAINT "ops_attribution_claims_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "ops_commercial_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_positioning_records" ADD CONSTRAINT "ops_positioning_records_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "ops_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_contributor_agreements" ADD CONSTRAINT "ops_contributor_agreements_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "ops_people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

