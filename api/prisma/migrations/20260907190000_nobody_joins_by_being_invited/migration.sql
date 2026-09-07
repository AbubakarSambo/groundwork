-- Adding an address to a check-in made it a member of your organisation, and put it on your bill.
CREATE TYPE "MembershipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

ALTER TABLE "users" ADD COLUMN "awaiting_org_approval" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "membership_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "requested_by_user_id" TEXT,
    "ground_id" TEXT,
    "status" "MembershipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_requests_organization_id_user_id_key" ON "membership_requests"("organization_id", "user_id");
CREATE INDEX "membership_requests_organization_id_status_idx" ON "membership_requests"("organization_id", "status");

ALTER TABLE "membership_requests" ADD CONSTRAINT "membership_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_requests" ADD CONSTRAINT "membership_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
