-- CreateEnum
CREATE TYPE "CompanyStage" AS ENUM ('IDEA', 'PRE_REVENUE', 'EARLY_REVENUE', 'SCALING');

-- DropForeignKey
ALTER TABLE "record_entries" DROP CONSTRAINT "record_entries_participant_id_fkey";

-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "warning_fired_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ground_participants" ADD COLUMN     "autonomy_ask" TEXT,
ADD COLUMN     "compensation_ask" TEXT,
ADD COLUMN     "exit_intent" TEXT,
ADD COLUMN     "financial_floor" TEXT,
ADD COLUMN     "founding_intent" TEXT,
ADD COLUMN     "growth_ask" TEXT,
ADD COLUMN     "personal_intent" TEXT,
ADD COLUMN     "recognition_ask" TEXT,
ADD COLUMN     "relational_tolerance" TEXT,
ADD COLUMN     "relationship_ask" TEXT,
ADD COLUMN     "role_intent" TEXT,
ADD COLUMN     "stress_tolerance" TEXT;

-- AlterTable
ALTER TABLE "grounds" ADD COLUMN     "stripe_scenario_sub_id" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "company_stage" "CompanyStage";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "pattern_benchmarks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "org_stage" "CompanyStage",
    "team_size_range" TEXT,
    "outcome_type" TEXT NOT NULL,
    "periods_to_outcome" INTEGER NOT NULL,
    "moment" "GroundMoment",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pattern_benchmarks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "record_entries" ADD CONSTRAINT "record_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
