-- Which piece of the customer's own work a check-in is about.
--
-- The link the org-level detectors were missing. Without it there is no way to ask whether two
-- people describe the SAME objective differently, because there is no way to know they were talking
-- about the same one - and inferring it from titles would mean deciding what somebody meant and
-- then reporting a divergence based on the guess.
--
-- Null for every ground made inside Groundwork, which is all of them today.

ALTER TABLE "grounds" ADD COLUMN "subject_external_id" TEXT;
CREATE INDEX "grounds_organization_id_subject_external_id_idx" ON "grounds"("organization_id", "subject_external_id");
