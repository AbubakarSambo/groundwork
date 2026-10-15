-- DECISION 75, ITEM 17, 2 October 2026. All five target kinds from the prototype: Up, Lower is better,
-- Rate, Deadline and Zero. The two values that exist already keep their names, because they already
-- mean exactly the prototype's first two kinds: 'AIM' is "Up" (an aim to reach) and 'LIMIT' is
-- "Lower is better" (a limit not to go over). So every existing row keeps its value and reads as it did,
-- and nothing existing is changed or guessed at. Three kinds are added:
--   'RATE'      a share or ratio over a period, to keep at or above its number (a percentage).
--   'DEADLINE'  a date to meet. The date is the new column "due_on".
--   'ZERO'      a count to keep at zero, where any at all is a breach.
ALTER TYPE "TargetDirection" ADD VALUE IF NOT EXISTS 'RATE';
ALTER TYPE "TargetDirection" ADD VALUE IF NOT EXISTS 'DEADLINE';
ALTER TYPE "TargetDirection" ADD VALUE IF NOT EXISTS 'ZERO';

ALTER TABLE "ground_objectives" ADD COLUMN "due_on" DATE;
