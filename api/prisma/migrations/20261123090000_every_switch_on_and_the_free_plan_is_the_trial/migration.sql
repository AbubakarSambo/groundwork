-- Every switch on, and the free plan is the free trial (Hafsah, 22 November 2026: "turn the switch on, nothing switch off from
-- now on, nothing at all"; "free trial is for teams of 20 and there's nothing like 10 free checkins").
--
-- Additive: new column defaults and settings rows switched on. Nothing is deleted. The migration of 22 November turned on every
-- organisation's release switches; this one turns on the platform-wide settings it missed and the organisation settings that
-- were still off. Safe to run again.

-- 1. The free trial: on, keeping its size and length, and remembering when it went on (no trial ends into a pause before it).
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('pricing.freeTrial', jsonb_build_object('on', true, 'teamsUnder', 20, 'months', 1, 'onSince', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), now())
ON CONFLICT ("key") DO UPDATE SET
  "value" = (
    CASE WHEN jsonb_typeof("platform_settings"."value") = 'object' THEN "platform_settings"."value" ELSE '{}'::jsonb END
  ) || jsonb_build_object(
    'on', true,
    'onSince', CASE
      WHEN ("platform_settings"."value"->>'on') = 'true' AND ("platform_settings"."value"->>'onSince') IS NOT NULL THEN "platform_settings"."value"->'onSince'
      ELSE to_jsonb(to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    END
  ),
  "updated_at" = now();

-- 2. The anchor's own trial: on.
INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('pricing.anchorTrial', '{"on": true, "months": 1, "people": 20}'::jsonb, now())
ON CONFLICT ("key") DO UPDATE SET "value" = '{"on": true, "months": 1, "people": 20}'::jsonb, "updated_at" = now();

-- 3. The release settings that can still say off, the WhatsApp switch, and recognising in reviews: on. A missing row already
--    reads as on; a row that said off is turned on.
INSERT INTO "platform_settings" ("key", "value", "updated_at") VALUES
  ('release.contextInAskGroundwork', '{"on": true}'::jsonb, now()),
  ('release.oldContextChat', '{"on": true}'::jsonb, now()),
  ('release.anchorScenario', '{"on": true}'::jsonb, now()),
  ('release.requestOfferInTheCheckIn', '{"on": true}'::jsonb, now()),
  ('release.whatsappHalfwayMessages', '{"on": true}'::jsonb, now()),
  ('whatsapp_enabled', 'true'::jsonb, now())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = now();

INSERT INTO "platform_settings" ("key", "value", "updated_at")
VALUES ('reviews.recognise', '{"on": true, "keptAtLeast": 0.9, "atLeastSettled": 8}'::jsonb, now())
ON CONFLICT ("key") DO UPDATE SET
  "value" = (CASE WHEN jsonb_typeof("platform_settings"."value") = 'object' THEN "platform_settings"."value" ELSE '{}'::jsonb END) || '{"on": true}'::jsonb,
  "updated_at" = now();

-- 4. Organisation settings: on by default, and on for every organisation already here.
ALTER TABLE "organizations" ALTER COLUMN "guests_may_join" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "who_may_add_people" SET DEFAULT 'ANYONE';
ALTER TABLE "organizations" ALTER COLUMN "allow_code_creation" SET DEFAULT true;
ALTER TABLE "contributor_codes" ALTER COLUMN "allow_code_creation" SET DEFAULT true;

UPDATE "organizations" SET
  "guests_may_join" = true,
  "who_may_add_people" = 'ANYONE',
  "allow_code_creation" = true,
  "release_1_sales_board_on" = true,
  "release_2_collections_on" = true,
  "release_3_invoices_on" = true,
  "invoices_after_a_sale_on" = true,
  "release_4_teams_on" = true,
  "release_5_projects_on" = true,
  "release_6_direction_on" = true,
  "release_7_people_on" = true,
  "release_8_situations_on" = true,
  "release_9_policy_on" = true,
  "person_judgements_on" = true,
  "design_pass_on" = true;

-- 5. Posting to a customer's own Slack or Teams channel, where they pasted the address, and the ops connection: on.
ALTER TABLE "workspace_notifiers" ALTER COLUMN "enabled" SET DEFAULT true;
UPDATE "workspace_notifiers" SET "enabled" = true;
ALTER TABLE "ops_integration" ALTER COLUMN "enabled" SET DEFAULT true;
UPDATE "ops_integration" SET "enabled" = true;
