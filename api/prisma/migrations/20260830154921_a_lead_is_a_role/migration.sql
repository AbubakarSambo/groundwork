-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'LEAD';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "may_open_check_ins";

