-- A PERSON'S RECORD IN ONE CHECK-IN, KEPT FROM THE RECORD (Groundwork does the managing, part 1; Hafsah, 21 October 2026). Add-only;
-- every statement can be run again.
--
-- What it does to rows already there: nothing. It adds one new table, empty, which is filled only when a check-in finishes after this
-- is deployed. No check-in, report, setting or person is read, changed or removed, and nobody is served anything from it unless their
-- organisation's direct morning is on.
CREATE TABLE IF NOT EXISTS "person_records" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "record" JSONB NOT NULL,
    "coaching" JSONB NOT NULL DEFAULT '[]',
    "last_session" INTEGER,
    "built_from" TEXT NOT NULL,
    "built_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "person_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "person_records_participant_id_key" ON "person_records"("participant_id");
CREATE INDEX IF NOT EXISTS "person_records_ground_id_idx" ON "person_records"("ground_id");
CREATE INDEX IF NOT EXISTS "person_records_user_id_organization_id_idx" ON "person_records"("user_id", "organization_id");
DO $$ BEGIN
  ALTER TABLE "person_records" ADD CONSTRAINT "person_records_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
