-- WAITING FOR AN ADMIN (U.3, #/join/waiting).
--
-- Whether the request came from a real invitation (only then is the admin named), and when the
-- person last pressed "Remind" (once a day, enforced on the server).
ALTER TABLE "membership_requests" ADD COLUMN "via_invitation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "membership_requests" ADD COLUMN "last_reminded_at" TIMESTAMP(3);
