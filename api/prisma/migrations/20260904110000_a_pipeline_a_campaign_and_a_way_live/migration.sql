-- CreateEnum
CREATE TYPE "OpsSalesStage" AS ENUM ('LEAD', 'CONTACTED', 'MEETING', 'PROPOSAL_TRIAL', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "OpsMarketingStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "ops_deployments" ADD COLUMN     "sales_opportunity_id" TEXT;

-- CreateTable
CREATE TABLE "ops_sales_opportunities" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "sales_owner_id" TEXT NOT NULL,
    "stage" "OpsSalesStage" NOT NULL DEFAULT 'LEAD',
    "source" TEXT,
    "originating_contributor_id" TEXT,
    "campaign_id" TEXT,
    "estimated_value" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "use_case_summary" TEXT,
    "last_activity_at" TIMESTAMP(3),
    "next_action" TEXT,
    "next_action_due_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "lost_at" TIMESTAMP(3),
    "lost_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_sales_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_marketing_activities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "channel" TEXT,
    "objective" TEXT,
    "owner_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" "OpsMarketingStatus" NOT NULL DEFAULT 'PLANNED',
    "campaign_source" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_marketing_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ops_sales_opportunities_stage_last_activity_at_idx" ON "ops_sales_opportunities"("stage", "last_activity_at");

-- CreateIndex
CREATE INDEX "ops_sales_opportunities_sales_owner_id_stage_idx" ON "ops_sales_opportunities"("sales_owner_id", "stage");

-- CreateIndex
CREATE INDEX "ops_sales_opportunities_next_action_due_at_idx" ON "ops_sales_opportunities"("next_action_due_at");

-- CreateIndex
CREATE INDEX "ops_marketing_activities_status_start_date_idx" ON "ops_marketing_activities"("status", "start_date");

-- AddForeignKey
ALTER TABLE "ops_sales_opportunities" ADD CONSTRAINT "ops_sales_opportunities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "ops_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_sales_opportunities" ADD CONSTRAINT "ops_sales_opportunities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ops_marketing_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

