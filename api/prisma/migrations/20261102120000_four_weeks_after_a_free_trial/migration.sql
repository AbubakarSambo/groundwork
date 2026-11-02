-- FOUR WEEKS AFTER A FREE TRIAL, THEN GROUNDWORK PAUSES UNTIL THEY PAY (Hafsah, 2 November 2026).
--
-- One settings row, edited at Admin, System, Pricing. It holds the four weeks and the timing of the emails; the words are the
-- product's own (api/src/modules/billing/the-trial-grace.ts) until somebody writes their own into the row's "words".
-- "onSince" is this moment: nobody's four weeks start before it, so an organisation whose free month ended long ago gets its
-- four weeks, and its emails, from today, never a pause by surprise. Nothing else changes, and nothing applies while the free
-- trial's switch (pricing.freeTrial) is off. A row already there is left as it is.
INSERT INTO "platform_settings" ("key", "value", "updated_at", "updated_by")
VALUES (
  'pricing.trialGrace',
  jsonb_build_object('weeks', 4, 'dailyForTheLastDays', 7, 'fromHour', 9, 'onSince', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  CURRENT_TIMESTAMP,
  'migration'
)
ON CONFLICT ("key") DO NOTHING;
