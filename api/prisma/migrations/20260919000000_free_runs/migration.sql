-- Three months on the house: a promise made to an address before there is an organisation.
CREATE TABLE "free_runs" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "months" INTEGER NOT NULL DEFAULT 3,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'GROWTH',
  "note" TEXT,
  "granted_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_by_organization_id" TEXT,
  "claimed_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "free_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "free_runs_email_key" ON "free_runs"("email");
CREATE INDEX "free_runs_claimed_by_organization_id_idx" ON "free_runs"("claimed_by_organization_id");

-- And what the gates read once it is claimed. A date, so it expires by arithmetic.
ALTER TABLE "organizations" ADD COLUMN "free_until" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN "free_plan" "SubscriptionPlan";
