-- A RATING IS A PLATFORM ADMIN'S ACT. PATCH /patterns/:id/rate was guarded by the organisation's
-- own admin role while the service said "only platform admins can rate", and the ratings feed the
-- per-code accuracy summary shown as fact on the prompts dashboard. Fixed in code (the route now
-- carries PlatformAdminGuard, as its sibling already did). Ratings given by anybody who is not a
-- platform admin are unset here, so the summary counts only the ratings it claims to count.
UPDATE "pattern_detections" d
SET "accuracy_rating" = NULL, "rated_at" = NULL, "rated_by" = NULL
FROM "users" u
WHERE d."rated_by" = u."id"
  AND u."is_platform_admin" = false;
