-- The display timezone was a placeholder nobody had chosen: America/New_York,
-- written by the seed with a note saying "awaiting a decision". Decided
-- 2026-09-05: the boards are dated where the company is run from.
--
-- Changing the default in code was not enough. The default only applies when no
-- row exists, and the seed had already written one — so the decision would have
-- reached a fresh install and nothing else.
--
-- Guarded on the old value: if somebody has since chosen a timezone themselves,
-- this leaves it alone rather than overwriting a real decision with ours.
UPDATE "ops_settings"
SET value = 'Africa/Lagos',
    note = 'The clock the boards date themselves by: where the company is run from. Decided 2026-09-05. A board dated in a timezone nobody is in makes "today" a different day for the person reading it.'
WHERE key = 'display.timezone'
  AND value = 'America/New_York';
