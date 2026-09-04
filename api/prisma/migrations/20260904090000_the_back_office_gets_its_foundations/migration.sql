-- CreateEnum
CREATE TYPE "OpsFunctionalRole" AS ENUM ('CEO', 'SALES_MARKETING', 'PRODUCT_TECH_LEAD', 'TECH', 'CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "OpsPeriodKind" AS ENUM ('SPRINT', 'QUARTER', 'CYCLE');

-- CreateEnum
CREATE TYPE "OpsPeriodStatus" AS ENUM ('PLANNED', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "OpsCompanyStage" AS ENUM ('LINED_UP', 'USE_CASE_CONFIRMED', 'PRODUCT_READY', 'ONBOARDED', 'LIVE');

-- CreateEnum
CREATE TYPE "OpsActivityDomain" AS ENUM ('SALES', 'FUNDING', 'DEPLOYMENT', 'PRODUCT', 'TECH', 'STRATEGY', 'MARKETING');

-- CreateTable
CREATE TABLE "ops_people" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "user_id" TEXT,
    "functional_role" "OpsFunctionalRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_grants" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" TEXT,

    CONSTRAINT "ops_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_periods" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "OpsPeriodKind" NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "goal" TEXT,
    "status" "OpsPeriodStatus" NOT NULL DEFAULT 'PLANNED',
    "parent_period_id" TEXT,

    CONSTRAINT "ops_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_workstreams" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_person_id" TEXT NOT NULL,
    "oversight_person_id" TEXT,
    "technical_partner_person_id" TEXT,
    "areas" TEXT[],

    CONSTRAINT "ops_workstreams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_companies" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary_contact_name" TEXT,
    "primary_contact_email" TEXT,
    "primary_contact_phone" TEXT,
    "source" TEXT,
    "originating_contributor_id" TEXT,
    "sprint_period_id" TEXT,
    "stage" "OpsCompanyStage" NOT NULL DEFAULT 'LINED_UP',
    "owner_person_id" TEXT,
    "next_action" TEXT,
    "next_action_due_at" TIMESTAMP(3),
    "blocker_summary" TEXT,
    "live_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_activities" (
    "id" TEXT NOT NULL,
    "domain" "OpsActivityDomain" NOT NULL,
    "kind" TEXT NOT NULL,
    "actor_person_id" TEXT,
    "record_type" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "company_id" TEXT,
    "happened_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "evidence_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ops_people_key_key" ON "ops_people"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ops_people_email_key" ON "ops_people"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ops_people_user_id_key" ON "ops_people"("user_id");

-- CreateIndex
CREATE INDEX "ops_people_active_idx" ON "ops_people"("active");

-- CreateIndex
CREATE INDEX "ops_grants_capability_idx" ON "ops_grants"("capability");

-- CreateIndex
CREATE UNIQUE INDEX "ops_grants_person_id_capability_key" ON "ops_grants"("person_id", "capability");

-- CreateIndex
CREATE UNIQUE INDEX "ops_periods_key_key" ON "ops_periods"("key");

-- CreateIndex
CREATE INDEX "ops_periods_kind_starts_on_idx" ON "ops_periods"("kind", "starts_on");

-- CreateIndex
CREATE UNIQUE INDEX "ops_workstreams_key_key" ON "ops_workstreams"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ops_companies_key_key" ON "ops_companies"("key");

-- CreateIndex
CREATE INDEX "ops_companies_stage_idx" ON "ops_companies"("stage");

-- CreateIndex
CREATE INDEX "ops_companies_sprint_period_id_idx" ON "ops_companies"("sprint_period_id");

-- CreateIndex
CREATE INDEX "ops_activities_domain_happened_at_idx" ON "ops_activities"("domain", "happened_at");

-- CreateIndex
CREATE INDEX "ops_activities_record_type_record_id_idx" ON "ops_activities"("record_type", "record_id");

-- CreateIndex
CREATE INDEX "ops_activities_company_id_happened_at_idx" ON "ops_activities"("company_id", "happened_at");

-- CreateIndex
CREATE INDEX "ops_activities_actor_person_id_happened_at_idx" ON "ops_activities"("actor_person_id", "happened_at");

-- AddForeignKey
ALTER TABLE "ops_grants" ADD CONSTRAINT "ops_grants_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "ops_people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_periods" ADD CONSTRAINT "ops_periods_parent_fkey" FOREIGN KEY ("parent_period_id") REFERENCES "ops_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

