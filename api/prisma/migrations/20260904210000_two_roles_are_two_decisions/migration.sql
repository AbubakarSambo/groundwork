-- DropIndex
DROP INDEX "ops_commercial_opportunities_attribution_state_idx";

-- AlterTable
ALTER TABLE "ops_commercial_opportunities" DROP COLUMN "attribution_state",
ADD COLUMN     "originator_state" "OpsAttributionState" NOT NULL DEFAULT 'NEEDS_REVIEW',
ADD COLUMN     "positioning_state" "OpsAttributionState" NOT NULL DEFAULT 'NEEDS_REVIEW';

-- CreateIndex
CREATE INDEX "ops_commercial_opportunities_originator_state_idx" ON "ops_commercial_opportunities"("originator_state");

