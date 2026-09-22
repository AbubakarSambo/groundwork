-- Who has been told a round's report is ready, once each. See ReportNotice in the schema.
CREATE TABLE "report_notices" (
  "id" TEXT NOT NULL,
  "ground_id" TEXT NOT NULL,
  "participant_id" TEXT NOT NULL,
  "session_number" INTEGER NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_notices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "report_notices_ground_id_participant_id_session_number_key" ON "report_notices"("ground_id", "participant_id", "session_number");
ALTER TABLE "report_notices" ADD CONSTRAINT "report_notices_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
