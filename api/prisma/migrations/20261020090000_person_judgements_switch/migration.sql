-- WHETHER ANYTHING THAT JUDGES A PERSON IS BUILT AND SERVED, A SWITCH PER ORGANISATION (production truth, 19 October 2026). Add-only;
-- the statement can be run again.
--
-- What it does to rows already there: nothing that changes how they read or behave. Every organisation gets
-- person_judgements_on = true, which is on, so everything reads and behaves exactly as it does today. It is set off for one
-- organisation at a time by scripts/the-person-judgements.ts, by its id. No check-in, setting, report or person is read,
-- changed or removed.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "person_judgements_on" BOOLEAN NOT NULL DEFAULT true;
