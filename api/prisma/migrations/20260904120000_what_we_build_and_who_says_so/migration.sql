-- CreateEnum
CREATE TYPE "OpsRoadmapStatus" AS ENUM ('PROPOSED', 'READY', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OpsWorkItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "OpsApprovalType" AS ENUM ('ROADMAP', 'REPRIORITISATION', 'COMMERCIAL', 'SPEND', 'RESOURCING');

-- CreateEnum
CREATE TYPE "OpsApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ops_roadmap_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "product_area" TEXT,
    "item_type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "owner_id" TEXT,
    "proposed_by_id" TEXT NOT NULL,
    "related_company_id" TEXT,
    "related_use_case_id" TEXT,
    "target_date" TIMESTAMP(3),
    "status" "OpsRoadmapStatus" NOT NULL DEFAULT 'PROPOSED',
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "rationale" TEXT,
    "expected_value" TEXT,
    "evidence_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "key" TEXT,

    CONSTRAINT "ops_roadmap_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_tech_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "item_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "owner_id" TEXT,
    "related_company_id" TEXT,
    "related_use_case_id" TEXT,
    "related_roadmap_item_id" TEXT,
    "related_deployment_id" TEXT,
    "status" "OpsWorkItemStatus" NOT NULL DEFAULT 'OPEN',
    "target_date" TIMESTAMP(3),
    "blocker_reason" TEXT,
    "evidence_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ops_tech_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_ux_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "affected_flow" TEXT,
    "description" TEXT,
    "source_note" TEXT,
    "related_company_id" TEXT,
    "related_use_case_id" TEXT,
    "severity" TEXT NOT NULL,
    "owner_id" TEXT,
    "status" "OpsWorkItemStatus" NOT NULL DEFAULT 'OPEN',
    "target_date" TIMESTAMP(3),
    "evidence_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ops_ux_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_use_case_links" (
    "id" TEXT NOT NULL,
    "use_case_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_use_case_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_approvals" (
    "id" TEXT NOT NULL,
    "approval_type" "OpsApprovalType" NOT NULL,
    "requester_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "related_record_type" TEXT NOT NULL,
    "related_record_id" TEXT NOT NULL,
    "request_summary" TEXT NOT NULL,
    "status" "OpsApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "ops_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ops_roadmap_items_key_key" ON "ops_roadmap_items"("key");

-- CreateIndex
CREATE INDEX "ops_roadmap_items_status_priority_idx" ON "ops_roadmap_items"("status", "priority");

-- CreateIndex
CREATE INDEX "ops_tech_items_status_severity_idx" ON "ops_tech_items"("status", "severity");

-- CreateIndex
CREATE INDEX "ops_tech_items_related_company_id_idx" ON "ops_tech_items"("related_company_id");

-- CreateIndex
CREATE INDEX "ops_ux_items_status_severity_idx" ON "ops_ux_items"("status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "ops_use_case_links_use_case_id_target_type_target_id_key" ON "ops_use_case_links"("use_case_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "ops_approvals_status_created_at_idx" ON "ops_approvals"("status", "created_at");

-- CreateIndex
CREATE INDEX "ops_approvals_related_record_type_related_record_id_idx" ON "ops_approvals"("related_record_type", "related_record_id");

-- AddForeignKey
ALTER TABLE "ops_use_case_links" ADD CONSTRAINT "ops_use_case_links_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "ops_client_use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

