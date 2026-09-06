-- A party that is an organisation, rather than a list of people somebody invited.
-- Standing on one check-in and nothing anywhere else; the tenant boundary is
-- untouched.
CREATE TABLE "ground_parties" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" TEXT,
    "named_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ground_parties_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ground_parties_ground_id_side_key" ON "ground_parties"("ground_id", "side");
CREATE INDEX "ground_parties_organization_id_idx" ON "ground_parties"("organization_id");
ALTER TABLE "ground_parties" ADD CONSTRAINT "ground_parties_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
