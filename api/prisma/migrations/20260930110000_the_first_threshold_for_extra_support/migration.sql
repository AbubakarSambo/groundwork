-- DECISION 61 (30 September 2026): THE FIRST THRESHOLD FOR WEEK 10.
--
-- Extra support is suggested when a person has kept fewer than half of their commitments, with at
-- least 6 settled (kept or not). Keep, reward, a plan and exit stay empty until each has its own
-- reading of the record.
--
-- The same shape as the free-team-size default (20260820160000_new_pricing_and_free_team_size):
-- one row in platform_settings, inserted only if it is not already there. `ON CONFLICT DO NOTHING`
-- so an admin who has already set thresholds through the admin page keeps exactly what they set -
-- this never overwrites a row that already exists, whatever it holds.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('suggestions.thresholds', '{"support": {"keptBelow": 0.5, "overPeriods": 6}}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
