-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN "is_self_correction" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "check_ins" ADD COLUMN "self_correction_target_session" INTEGER;
