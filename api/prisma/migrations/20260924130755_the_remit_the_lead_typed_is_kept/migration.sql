-- What the lead wrote when they added somebody, kept.
--
-- The "What do you want them to cover?" note on the add-a-participant form went into the invite
-- email and nowhere else. It is the only place a lead says what a person is accountable for in
-- their own words, and the report's gap section had nothing to read a record against except a job
-- title - which printed "Government Liaison Consultant was taken on for: Government Liaison
-- Consultant".
ALTER TABLE "ground_participants" ADD COLUMN IF NOT EXISTS "remit_as_given" TEXT;
