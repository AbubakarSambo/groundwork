-- 21 November 2026. Add-only.
-- The leave policy (Hafsah, 20 November 2026): offices in other countries, each with its own public
-- holidays as dated rows, and the office each person works from. The rest of the policy (types of
-- leave, accrual, carry-over, whether weekends and public holidays count) is kept in the leave rules,
-- beside the kinds of leave already there. Nothing existing changes: with no offices and no holidays,
-- every request counts Monday to Friday exactly as before.
CREATE TABLE "leave_offices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "country" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_offices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leave_offices_organization_id_name_key" ON "leave_offices"("organization_id", "name");
ALTER TABLE "leave_offices" ADD CONSTRAINT "leave_offices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "public_holidays" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "office_id" TEXT,
    "on" DATE NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "drafted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "public_holidays_organization_id_on_idx" ON "public_holidays"("organization_id", "on");
ALTER TABLE "public_holidays" ADD CONSTRAINT "public_holidays_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_memberships" ADD COLUMN "office_id" TEXT;
