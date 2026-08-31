-- An import survives a restart.
--
-- The work ran from the request body held in memory, so a deploy mid-import left the job RUNNING
-- forever and the remaining rows gone - not failed, not retryable, gone, while the customer's
-- system held a 200 saying the import had started. The rows now live with the job, and a cursor
-- says where to pick up.

ALTER TABLE "import_jobs" ADD COLUMN "payload" JSONB;
ALTER TABLE "import_jobs" ADD COLUMN "cursor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "import_jobs" ADD COLUMN "heartbeat_at" TIMESTAMP(3);
