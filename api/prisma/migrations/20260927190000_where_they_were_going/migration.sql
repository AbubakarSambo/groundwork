-- WHERE THEY WERE GOING (U.3 review). Somebody who signs up or asks for a sign-in link from an
-- organisation's invite link is carried back to it after confirming their email. Two new empty
-- columns; nothing existing changes. Only a path inside the app is ever written to them.
ALTER TABLE "pending_signups" ADD COLUMN "next_path" TEXT;
ALTER TABLE "email_verification_tokens" ADD COLUMN "next_path" TEXT;
