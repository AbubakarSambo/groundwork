-- A WAITING GOOGLE SIGN-UP (U.3 review). Somebody who signs up with Google from an invite link, or
-- whose domain an organisation lets join, chooses where they work before any account is made. One
-- new empty column on the waiting sign-up; nothing existing changes.
ALTER TABLE "pending_signups" ADD COLUMN "google_id" TEXT;
