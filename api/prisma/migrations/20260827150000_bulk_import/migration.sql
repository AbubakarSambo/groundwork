-- Bulk import: the job, what it could not take, and the quiet period it starts.
--
-- The failures table is the point. A summary count tells a customer something is wrong with no way
-- to act on it, which is worse than a plain error because it looks like it was handled. A skipped
-- row is recorded with its position AND its external id, because either alone is not enough.
--
-- The quiet period is stamped when the import runs, even though no detector exists yet to be
-- suppressed. Computed later it would be useless: the import that should have started it would
-- have happened months earlier and left no trace.

CREATE TYPE "ImportJobState" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'ABANDONED');

CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" "ImportJobState" NOT NULL DEFAULT 'QUEUED',
    "total" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "import_jobs_organization_id_created_at_idx" ON "import_jobs"("organization_id", "created_at");
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "import_job_failures" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "external_id" TEXT,
    "message" TEXT NOT NULL,

    CONSTRAINT "import_job_failures_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "import_job_failures_job_id_idx" ON "import_job_failures"("job_id");
ALTER TABLE "import_job_failures" ADD CONSTRAINT "import_job_failures_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "detection_quiet_periods" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "import_job_id" TEXT,
    "subject_count" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detection_quiet_periods_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "detection_quiet_periods_organization_id_ends_at_idx" ON "detection_quiet_periods"("organization_id", "ends_at");
ALTER TABLE "detection_quiet_periods" ADD CONSTRAINT "detection_quiet_periods_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
