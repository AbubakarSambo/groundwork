-- Week 13: a plan read into proposals, each waiting for the lead to confirm it. Adds one table; changes no data.
CREATE TABLE "plan_proposals" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "says" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "from_the_plan" TEXT NOT NULL,
    "from_document" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "edited_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "decided_by_user_id" TEXT,
    "became_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_proposals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "plan_proposals_ground_id_status_idx" ON "plan_proposals"("ground_id", "status");
ALTER TABLE "plan_proposals" ADD CONSTRAINT "plan_proposals_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
