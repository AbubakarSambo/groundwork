-- 19 November 2026. Add-only, nothing to backfill: an organisation with no row reads exactly as before.
-- The stretches when Groundwork was paused for an organisation (N51), so rounds that opened in a pause stay "could not be answered"
-- after the organisation chooses a plan.
CREATE TABLE "organization_pauses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "paused_from" TIMESTAMP(3) NOT NULL,
    "resumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_pauses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "organization_pauses_organization_id_idx" ON "organization_pauses"("organization_id");
