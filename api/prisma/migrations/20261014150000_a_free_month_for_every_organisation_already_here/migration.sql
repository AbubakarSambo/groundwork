-- A FREE MONTH FOR EVERY ORGANISATION ALREADY HERE (Hafsah, 14 October 2026).
--
-- Every organisation that exists when this runs, that does not pay and is not already covered, gets one free month
-- from the day this runs on that server, on the plan that holds its current number of people, WhatsApp included.
-- It reads as the free trial on Plan and billing. Add-only and safe to run again: it adds one column, and it marks
-- each organisation it gives the month to, so nobody gets it twice. A paying organisation, and one with a free run
-- still going, are not touched. No email is sent.

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "free_month_of_release_at" TIMESTAMP(3);

WITH "seats" AS (
  SELECT o."id" AS "organization_id", COUNT(u."id") AS "people"
  FROM "organizations" o
  LEFT JOIN "users" u
    ON u."is_active" = true AND u."deleted_at" IS NULL AND u."awaiting_org_approval" = false
   AND (
     EXISTS (SELECT 1 FROM "organization_memberships" m WHERE m."user_id" = u."id" AND m."organization_id" = o."id" AND m."held_for_a_seat" = false)
     OR (u."organization_id" = o."id" AND NOT EXISTS (SELECT 1 FROM "organization_memberships" m2 WHERE m2."user_id" = u."id" AND m2."organization_id" = o."id"))
   )
  GROUP BY o."id"
),
"chosen" AS (
  SELECT s."organization_id", s."people",
    (SELECT p."plan" FROM "pricing_plans" p
      WHERE p."amount_cents" IS NOT NULL AND (p."member_cap" IS NULL OR p."member_cap" >= GREATEST(s."people", 1))
      ORDER BY p."amount_cents" ASC LIMIT 1) AS "plan"
  FROM "seats" s
)
UPDATE "organizations" o
SET "free_until" = now() + interval '1 month',
    "free_plan" = c."plan",
    -- Read as the free trial where the team is under the trial's size; a larger team reads "You are on us until ...",
    -- so it is never told its free months are only for smaller teams.
    "free_trial_started_at" = CASE
      WHEN c."people" < COALESCE((SELECT ("value"->>'teamsUnder')::int FROM "platform_settings" WHERE "key" = 'pricing.freeTrial'), 20)
        THEN COALESCE(o."free_trial_started_at", now())
      ELSE o."free_trial_started_at" END,
    "whatsapp_free_until" = GREATEST(COALESCE(o."whatsapp_free_until", now()), now() + interval '1 month'),
    "free_month_of_release_at" = now()
FROM "chosen" c
WHERE c."organization_id" = o."id"
  AND c."plan" IS NOT NULL
  AND o."free_month_of_release_at" IS NULL
  AND NOT (o."subscription_plan" IS NOT NULL AND o."subscription_status" = 'active')
  AND (o."free_until" IS NULL OR o."free_until" <= now());
