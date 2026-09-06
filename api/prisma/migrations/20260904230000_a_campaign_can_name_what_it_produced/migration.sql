-- AlterTable
ALTER TABLE "ops_commercial_opportunities" ADD COLUMN     "campaign_id" TEXT;

-- AddForeignKey
ALTER TABLE "ops_commercial_opportunities" ADD CONSTRAINT "ops_commercial_opportunities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ops_marketing_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

