-- SPENDING AND BUDGETS (U.17, E7). Two new tables, empty until used: requests to spend, each waiting
-- for a yes or no from the one who approves it, and each team's budget for a month, set by an admin.
-- Nothing existing is altered.
CREATE TABLE "spend_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "what" VARCHAR(300) NOT NULL,
    "team" VARCHAR(120),
    "status" VARCHAR(16) NOT NULL DEFAULT 'waiting',
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spend_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_budgets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "team" VARCHAR(120) NOT NULL,
    "month" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "set_by_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_budgets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "spend_requests_organization_id_status_idx" ON "spend_requests"("organization_id", "status");

CREATE INDEX "spend_requests_organization_id_created_at_idx" ON "spend_requests"("organization_id", "created_at");

CREATE UNIQUE INDEX "team_budgets_organization_id_team_month_key" ON "team_budgets"("organization_id", "team", "month");

ALTER TABLE "spend_requests" ADD CONSTRAINT "spend_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_budgets" ADD CONSTRAINT "team_budgets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

