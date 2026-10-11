-- Which stored version of the detector's prompt read the check-in that last kept a pattern (decision 128).
-- Empty on rows written before the prompt was stored; those stay valid.
ALTER TABLE "pattern_detections" ADD COLUMN "prompt_version_id" TEXT;
ALTER TABLE "pattern_detections" ADD CONSTRAINT "pattern_detections_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
