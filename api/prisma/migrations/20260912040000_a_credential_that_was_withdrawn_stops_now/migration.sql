-- A CREDENTIAL THAT WAS WITHDRAWN STOPS NOW (fix plan A10, with B16's epoch).
--
-- users.token_epoch is minted into every session token and compared on every request; a password
-- reset increments it, so the sessions that prompted the reset end. Existing tokens carry no epoch
-- and read as 0, which is the default here, so nobody is signed out by this deploy.
ALTER TABLE "users" ADD COLUMN "token_epoch" INTEGER NOT NULL DEFAULT 0;

-- Emailed set-password, reset and magic-link tokens are stored as their SHA-256 from now on, and
-- looked up by hash. The unused rows are hashed in place so the links already in people's inboxes
-- keep working; used ones are left as they are, nothing reads them.
UPDATE "email_verification_tokens"
SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex')
WHERE "used_at" IS NULL AND length("token") <> 64;
