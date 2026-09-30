-- WEEK 12B. The weekly report's sentence about each person. Nothing existing changes; the table is new and empty.
CREATE TABLE "weekly_reports" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "week_start" VARCHAR(10) NOT NULL,
    "each_person" JSONB NOT NULL,
    "built_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "weekly_reports_ground_id_week_start_key" ON "weekly_reports"("ground_id", "week_start");
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
