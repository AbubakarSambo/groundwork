-- JOINING BY EMAIL DOMAIN (U.3). The domain an admin lets anyone join by, while it is switched on.
-- One organisation per domain. Null for every organisation until an admin turns it on.
ALTER TABLE "organizations" ADD COLUMN "join_domain" TEXT;
CREATE UNIQUE INDEX "organizations_join_domain_key" ON "organizations"("join_domain");
