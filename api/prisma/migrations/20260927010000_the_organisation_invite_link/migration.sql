-- THE ORGANISATION'S OWN INVITE LINK (U.3). The code in /j/<code>, and who turned it on. Null while
-- it is off; a new code each time it is turned on.
ALTER TABLE "organizations" ADD COLUMN "invite_link_code" TEXT;
ALTER TABLE "organizations" ADD COLUMN "invite_link_by_user_id" TEXT;
CREATE UNIQUE INDEX "organizations_invite_link_code_key" ON "organizations"("invite_link_code");
