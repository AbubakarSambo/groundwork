-- RELEASE 3, RAISING INVOICES ON TIME, TWO SWITCHES PER ORGANISATION (Hafsah, 24 October 2026). Add-only; the statements can be run again.
--
-- What it does to rows already there: nothing that changes how they read or behave. Every organisation gets both switches off,
-- so every lead, team member and admin reads exactly what they read today. They are set on for one organisation at a time by
-- scripts/release-3-invoices.ts, by its id. No check-in, setting, report or person is read, changed or removed.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_3_invoices_on" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "invoices_after_a_sale_on" BOOLEAN NOT NULL DEFAULT false;
