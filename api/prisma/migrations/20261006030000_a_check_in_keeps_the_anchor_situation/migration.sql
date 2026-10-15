-- The anchor scenario's situation is saved on the check-in it starts, instead of being recorded as NEW_PROJECT.
-- Only an enum value is added. No existing row is changed.
ALTER TYPE "GroundScenario" ADD VALUE IF NOT EXISTS 'HELP_TEAM_UNDERSTAND';
