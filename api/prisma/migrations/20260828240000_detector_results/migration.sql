-- A behaviour seen, accumulated across grounds and against a subject.
--
-- One vocabulary, two scopes. pattern_detections stays exactly as it is and stays authoritative
-- inside its ground; this is the same code seen from org level, which is the only place a behaviour
-- can be tied to a piece of the customer's own work or watched across more than one check-in.
--
-- Additive: nothing in the live product reads it.

CREATE TABLE "detector_results" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT,
    "subject_external_id" TEXT,
    "key" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "evidence" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source_ground_id" TEXT,
    "source_pattern_detection_id" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "detector_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "detector_results_source_pattern_detection_id_key" ON "detector_results"("source_pattern_detection_id");
CREATE INDEX "detector_results_organization_id_key_resolved_at_idx" ON "detector_results"("organization_id", "key", "resolved_at");
CREATE INDEX "detector_results_organization_id_subject_external_id_idx" ON "detector_results"("organization_id", "subject_external_id");
CREATE INDEX "detector_results_organization_id_person_external_id_idx" ON "detector_results"("organization_id", "person_external_id");

ALTER TABLE "detector_results" ADD CONSTRAINT "detector_results_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
