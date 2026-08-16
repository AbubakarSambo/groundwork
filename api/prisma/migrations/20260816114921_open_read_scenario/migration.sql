-- AlterEnum
ALTER TYPE "GroundScenario" ADD VALUE 'OPEN_READ';

-- DropForeignKey
ALTER TABLE "contributor_code_redemptions" DROP CONSTRAINT "contributor_code_redemptions_code_id_fkey";

-- DropForeignKey
ALTER TABLE "contributor_codes" DROP CONSTRAINT "contributor_codes_created_by_user_id_fkey";

-- AlterTable
ALTER TABLE "contributor_codes" ALTER COLUMN "expires_at" SET DEFAULT NOW() + INTERVAL '90 days';

-- AddForeignKey
ALTER TABLE "contributor_codes" ADD CONSTRAINT "contributor_codes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributor_code_redemptions" ADD CONSTRAINT "contributor_code_redemptions_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "contributor_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
