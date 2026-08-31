-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "check_ins_need_approval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "who_may_open_check_ins" TEXT NOT NULL DEFAULT 'NAMED_LEADS';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "may_open_check_ins" BOOLEAN NOT NULL DEFAULT false;

