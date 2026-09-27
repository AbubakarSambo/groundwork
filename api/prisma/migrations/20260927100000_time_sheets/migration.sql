-- TIME SHEETS (U.17, E3). Three new tables, empty until hours come in. Hours are for billing only
-- (decisions rule 10) and never reach a check-in or its report. Nothing existing is altered.
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client" VARCHAR(120) NOT NULL,
    "on_day" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_weeks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_of" DATE NOT NULL,
    "approved_minutes" INTEGER NOT NULL,
    "approved_by_id" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_weeks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_agreements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "client" VARCHAR(120) NOT NULL,
    "work" VARCHAR(200) NOT NULL,
    "hours" INTEGER NOT NULL,
    "span" VARCHAR(8) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_agreements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_entries_organization_id_on_day_idx" ON "time_entries"("organization_id", "on_day");

CREATE INDEX "time_entries_organization_id_user_id_on_day_idx" ON "time_entries"("organization_id", "user_id", "on_day");

CREATE UNIQUE INDEX "time_weeks_organization_id_user_id_week_of_key" ON "time_weeks"("organization_id", "user_id", "week_of");

CREATE INDEX "time_agreements_organization_id_idx" ON "time_agreements"("organization_id");

ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_weeks" ADD CONSTRAINT "time_weeks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_agreements" ADD CONSTRAINT "time_agreements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
