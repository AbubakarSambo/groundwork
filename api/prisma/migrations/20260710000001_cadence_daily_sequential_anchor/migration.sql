-- Add new cadence options
ALTER TYPE "Cadence" ADD VALUE IF NOT EXISTS 'DAILY';
ALTER TYPE "Cadence" ADD VALUE IF NOT EXISTS 'SEQUENTIAL';

-- Anchor day for weekly schedules (0=Sun..6=Sat), e.g. "every Monday"
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "cadence_anchor_day" INTEGER;
