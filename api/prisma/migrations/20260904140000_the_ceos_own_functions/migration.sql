-- CreateEnum
CREATE TYPE "OpsFundingStage" AS ENUM ('TARGET', 'CONTACTED', 'MEETING', 'FOLLOW_UP', 'APPLICATION_DILIGENCE', 'COMMITTED', 'CLOSED', 'DECLINED');

-- CreateEnum
CREATE TYPE "OpsStrategicStatus" AS ENUM ('IDENTIFIED', 'OUTREACH', 'ENGAGED', 'OPPORTUNITY_CREATED', 'COMPLETED', 'DORMANT', 'CLOSED');

-- CreateEnum
CREATE TYPE "OpsRequestStatus" AS ENUM ('OPEN', 'DECIDED');

-- CreateEnum
CREATE TYPE "OpsExpenseStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "ops_funding_opportunities" (
    "id" TEXT NOT NULL,
    "funder_name" TEXT NOT NULL,
    "primary_contact" TEXT,
    "funding_type" TEXT NOT NULL,
    "source" TEXT,
    "owner_id" TEXT NOT NULL,
    "stage" "OpsFundingStage" NOT NULL DEFAULT 'TARGET',
    "ask_amount" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "instrument" TEXT,
    "last_activity_at" TIMESTAMP(3),
    "next_action" TEXT,
    "next_action_due_at" TIMESTAMP(3),
    "application_deadline" TIMESTAMP(3),
    "committed_amount" DECIMAL(14,2),
    "closed_amount" DECIMAL(14,2),
    "status_note" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_funding_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_strategic_opportunities" (
    "id" TEXT NOT NULL,
    "person_or_network" TEXT NOT NULL,
    "organization" TEXT,
    "opportunity_type" TEXT NOT NULL,
    "objective" TEXT,
    "owner_id" TEXT NOT NULL,
    "status" "OpsStrategicStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "source" TEXT,
    "last_activity_at" TIMESTAMP(3),
    "next_step" TEXT,
    "next_step_due_at" TIMESTAMP(3),
    "impact_note" TEXT,
    "converted_to_type" TEXT,
    "converted_to_id" TEXT,
    "linked_contributor_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_strategic_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_resource_requests" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "support_needed" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "affected_work_type" TEXT,
    "affected_record_id" TEXT,
    "urgency" TEXT NOT NULL,
    "requested_by_date" TIMESTAMP(3),
    "status" "OpsRequestStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_resource_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_expenses" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "receipt_url" TEXT,
    "notes" TEXT,
    "status" "OpsExpenseStatus" NOT NULL DEFAULT 'REQUESTED',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "rejected_reason" TEXT,

    CONSTRAINT "ops_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_earnings_entries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL,
    "note" TEXT,
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_earnings_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ops_funding_opportunities_stage_last_activity_at_idx" ON "ops_funding_opportunities"("stage", "last_activity_at");

-- CreateIndex
CREATE INDEX "ops_funding_opportunities_next_action_due_at_idx" ON "ops_funding_opportunities"("next_action_due_at");

-- CreateIndex
CREATE INDEX "ops_strategic_opportunities_status_idx" ON "ops_strategic_opportunities"("status");

-- CreateIndex
CREATE INDEX "ops_resource_requests_status_idx" ON "ops_resource_requests"("status");

-- CreateIndex
CREATE INDEX "ops_expenses_requester_id_status_idx" ON "ops_expenses"("requester_id", "status");

-- CreateIndex
CREATE INDEX "ops_expenses_status_idx" ON "ops_expenses"("status");

-- CreateIndex
CREATE INDEX "ops_earnings_entries_date_idx" ON "ops_earnings_entries"("date");

