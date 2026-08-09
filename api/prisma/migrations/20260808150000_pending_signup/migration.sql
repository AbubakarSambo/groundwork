-- Nothing is provisioned until the email address is verified.
--
-- Submitting an email on the entry flow used to create a User with role ADMIN and
-- an Organization immediately, both with is_email_verified = false. Typing a
-- stranger's work address provisioned an organisation and an admin account in
-- their name. This table holds the signup until the link in the mail is opened;
-- the Organization, User and EntryDraft are created only then.
--
-- See GW-001 in journey/run18/ISSUES-LOG.md.
CREATE TABLE "pending_signups" (
  "id"          TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "token"       TEXT NOT NULL,
  "first_name"  TEXT NOT NULL,
  "org_name"    TEXT,
  "payload"     JSONB,
  "history"     JSONB,
  "draft_token" TEXT,
  "expires_at"  TIMESTAMP(3) NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pending_signups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_signups_email_key"       ON "pending_signups"("email");
CREATE UNIQUE INDEX "pending_signups_token_key"       ON "pending_signups"("token");
CREATE UNIQUE INDEX "pending_signups_draft_token_key" ON "pending_signups"("draft_token");
