-- ONE PIPELINE, NOT TWO.
--
-- The old sales pipeline ran beside the commercial one: same companies, same
-- stages, a different set of numbers, and no record of who created anything.
-- Two pipelines is how a company ends up with two answers to "how much are we
-- selling", so the one carrying attribution is the one that survives.
--
-- THE ROWS MOVE BEFORE THE TABLE GOES. Prisma's own diff would simply drop it,
-- and this table is empty everywhere today - but "it is empty on my machine" is
-- not a migration, and the cost of being wrong about that is somebody's CRM.
--
-- Everything arrives as NEEDS_REVIEW. Nothing is inferred: not from who owned
-- the sale, not from who created the record, not from who was next to it. The
-- old table's `originating_contributor_id` was never once filled in, and if it
-- had been it would become a CLAIM to be approved rather than a credit - a
-- field nobody deliberately used is not evidence of anything.

INSERT INTO "ops_commercial_opportunities" (
  "id", "company_id", "name", "stage",
  "originator_state", "positioning_state",
  "estimated_contract_value", "currency",
  "next_action", "next_action_due_at",
  "notes", "created_at", "lost_at", "lost_reason"
)
SELECT
  o."id",
  o."company_id",
  COALESCE(NULLIF(TRIM(o."use_case_summary"), ''), 'Opportunity carried over from the old pipeline'),
  CASE o."stage"::text
    WHEN 'LEAD' THEN 'LEAD'
    WHEN 'CONTACTED' THEN 'LEAD'
    WHEN 'MEETING' THEN 'DEMO_DISCOVERY'
    WHEN 'PROPOSAL_TRIAL' THEN 'PROPOSAL'
    -- CONVERTED becomes VERBAL_YES, not PAYING. The old pipeline had no concept
    -- of money arriving, so calling a converted deal a paying one would invent
    -- a payment that never existed and start a retention clock on nothing.
    WHEN 'CONVERTED' THEN 'VERBAL_YES'
    WHEN 'LOST' THEN 'LOST'
    ELSE 'LEAD'
  END::"OpsCommercialStage",
  'NEEDS_REVIEW'::"OpsAttributionState",
  'NEEDS_REVIEW'::"OpsAttributionState",
  o."estimated_value",
  o."currency",
  o."next_action",
  o."next_action_due_at",
  o."notes",
  o."created_at",
  o."lost_at",
  o."lost_reason"
FROM "ops_sales_opportunities" o;

-- Where somebody was recorded as the originating contributor, that becomes a
-- claim for them - unapproved, and visible in the review queue.
INSERT INTO "ops_attribution_claims" (
  "id", "opportunity_id", "claimant_id", "role", "claimed_basis", "state", "created_at"
)
SELECT
  gen_random_uuid(),
  o."id",
  o."originating_contributor_id",
  'OPPORTUNITY_ORIGINATOR'::"OpsContributionRole",
  'Carried over from the old pipeline, where this person was recorded as the originating contributor. Nobody has confirmed it.',
  'CLAIMED'::"OpsAttributionState",
  o."created_at"
FROM "ops_sales_opportunities" o
WHERE o."originating_contributor_id" IS NOT NULL;

UPDATE "ops_commercial_opportunities" c
SET "originator_state" = 'CLAIMED'::"OpsAttributionState"
FROM "ops_sales_opportunities" o
WHERE c."id" = o."id" AND o."originating_contributor_id" IS NOT NULL;

-- Now the table can go.
-- DropForeignKey
ALTER TABLE "ops_sales_opportunities" DROP CONSTRAINT "ops_sales_opportunities_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "ops_sales_opportunities" DROP CONSTRAINT "ops_sales_opportunities_company_id_fkey";

-- AlterTable
ALTER TABLE "ops_deployments" DROP COLUMN "sales_opportunity_id";

-- DropTable
DROP TABLE "ops_sales_opportunities";

-- DropEnum
DROP TYPE "OpsSalesStage";

