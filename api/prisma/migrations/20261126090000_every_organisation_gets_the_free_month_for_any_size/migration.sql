-- EVERY ORGANISATION THAT DOES NOT PAY GETS AT LEAST A MONTH OF THE FREE TRIAL, WHATEVER ITS SIZE (Hafsah, 25 November 2026).
--
-- "Put everyone on any free trial at 20 people, so every existing user, so we don't have to do this again", and the month is
-- for everyone "regardless of what plan they choose". Rhea's pilot was held to 5 people: the free month of 14 October gave
-- each organisation the plan that held the people it had then (often Starter, 5 people), and a team of 20 or more, or one
-- that said "more", was never given the trial. New organisations now get the trial whatever their size
-- (the-free-trial.service.ts). This brings every organisation already here up to the same.
--
-- For every organisation that is not paying:
--   - its free run lasts at least one month from the day this runs, and so does its free WhatsApp (free for up to 20 people,
--     whatsapp-add-on.service.ts);
--   - it reads as the free trial (`free_trial_started_at`), so it is not given a second one later;
--   - its free plan is the cheapest priced plan that holds 20 people (Small Team), unless a running free plan already holds 20.
-- A paying organisation is not touched. Nothing is shortened or made smaller. No email is sent. Safe to run again.

WITH "twenty" AS (
  SELECT p."plan" FROM "pricing_plans" p
  WHERE p."amount_cents" IS NOT NULL AND (p."member_cap" IS NULL OR p."member_cap" >= 20)
  ORDER BY p."amount_cents" ASC LIMIT 1
)
UPDATE "organizations" o
SET "free_plan" = CASE
      WHEN o."free_until" > now() AND o."free_plan" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "pricing_plans" p WHERE p."plan" = o."free_plan" AND (p."member_cap" IS NULL OR p."member_cap" >= 20)
      ) THEN o."free_plan"
      ELSE t."plan" END,
    "free_until" = GREATEST(COALESCE(o."free_until", now()), now() + interval '1 month'),
    "free_trial_started_at" = COALESCE(o."free_trial_started_at", now()),
    "whatsapp_free_until" = GREATEST(COALESCE(o."whatsapp_free_until", now()), now() + interval '1 month')
FROM "twenty" t
WHERE NOT (o."subscription_plan" IS NOT NULL AND o."subscription_status" = 'active');
