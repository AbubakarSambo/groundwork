-- The name somebody gave at the end of an open-link check-in, and whether they asked for the report.
ALTER TABLE "ground_participants" ADD COLUMN "name_given" VARCHAR(120);
ALTER TABLE "ground_participants" ADD COLUMN "wants_the_report" BOOLEAN;
