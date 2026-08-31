CREATE TABLE "email_preferences" (
  "id"                 TEXT NOT NULL,
  "organization_id"    TEXT NOT NULL,
  "person_external_id" TEXT NOT NULL,
  "round_digest"       BOOLEAN NOT NULL DEFAULT true,
  "nudges"             BOOLEAN NOT NULL DEFAULT true,
  "quiet_before_hour"  INTEGER,
  "quiet_after_hour"   INTEGER,
  "unsubscribe_token"  TEXT NOT NULL,
  "unsubscribed_at"    TIMESTAMP(3),
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id")
);

-- The token is the whole of the authentication on the unsubscribe link, so it has to be unique and
-- it is looked up by itself.
CREATE UNIQUE INDEX "email_preferences_unsubscribe_token_key" ON "email_preferences" ("unsubscribe_token");
-- One preference row per person. Two would mean an opt-out that half applied.
CREATE UNIQUE INDEX "email_preferences_org_person_key" ON "email_preferences" ("organization_id", "person_external_id");

ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
