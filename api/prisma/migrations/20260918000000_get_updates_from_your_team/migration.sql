-- Get updates from your team: one line, some email addresses, and a rhythm.
--
-- The lightest situation in the product. The lead's own line is the question everybody answers, the
-- product carries it and asks for whatever makes an answer checkable, and nothing is set up.
--
-- Adding a value to an enum is not reversible in Postgres without rebuilding the type, and it does
-- not need to be: no row can hold it until something writes one.
ALTER TYPE "GroundScenario" ADD VALUE IF NOT EXISTS 'TEAM_UPDATES';
