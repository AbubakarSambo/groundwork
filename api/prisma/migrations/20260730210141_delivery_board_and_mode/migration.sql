-- CreateEnum
CREATE TYPE "GroundMode" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "DependencyStatus" AS ENUM ('BLOCKING', 'WAITING', 'CLEARED');

-- AlterTable
ALTER TABLE "ground_participants" ADD COLUMN     "detected_function" TEXT,
ADD COLUMN     "detected_function_at" TIMESTAMP(3),
ADD COLUMN     "detected_function_confidence" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "grounds" ADD COLUMN     "mode" "GroundMode" NOT NULL DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "ground_objectives" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" INTEGER,
    "prev_count" INTEGER NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,
    "added_at_session" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ground_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ground_dependencies" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "from_participant_id" TEXT NOT NULL,
    "on_participant_id" TEXT,
    "on_label" TEXT,
    "what" TEXT NOT NULL,
    "then" TEXT,
    "status" "DependencyStatus" NOT NULL DEFAULT 'WAITING',
    "source_check_in_id" TEXT,
    "cleared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ground_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ground_meetings" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "happened_at" TIMESTAMP(3) NOT NULL,
    "present_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ground_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ground_polls" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ground_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ground_poll_options" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "who_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ground_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ground_objectives_ground_id_idx" ON "ground_objectives"("ground_id");

-- CreateIndex
CREATE INDEX "ground_dependencies_ground_id_idx" ON "ground_dependencies"("ground_id");

-- CreateIndex
CREATE INDEX "ground_meetings_ground_id_idx" ON "ground_meetings"("ground_id");

-- CreateIndex
CREATE UNIQUE INDEX "ground_polls_ground_id_key" ON "ground_polls"("ground_id");

-- CreateIndex
CREATE INDEX "ground_poll_options_poll_id_idx" ON "ground_poll_options"("poll_id");

-- AddForeignKey
ALTER TABLE "ground_objectives" ADD CONSTRAINT "ground_objectives_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_dependencies" ADD CONSTRAINT "ground_dependencies_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_dependencies" ADD CONSTRAINT "ground_dependencies_from_participant_id_fkey" FOREIGN KEY ("from_participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_dependencies" ADD CONSTRAINT "ground_dependencies_on_participant_id_fkey" FOREIGN KEY ("on_participant_id") REFERENCES "ground_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_meetings" ADD CONSTRAINT "ground_meetings_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_polls" ADD CONSTRAINT "ground_polls_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_poll_options" ADD CONSTRAINT "ground_poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "ground_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
