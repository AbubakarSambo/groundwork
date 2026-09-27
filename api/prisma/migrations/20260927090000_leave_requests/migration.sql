-- LEAVE REQUESTS (U.17, E2, the leave suite). A new table, empty until somebody asks for time off.
-- Who is off, from which day to which day, who stands in, and the decision with who made it and when.
-- No reason is kept. Nothing existing is altered.
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "kind" VARCHAR(16) NOT NULL DEFAULT 'annual',
    "stand_in_user_id" TEXT,
    "status" VARCHAR(12) NOT NULL DEFAULT 'waiting',
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "asked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leave_requests_organization_id_status_idx" ON "leave_requests"("organization_id", "status");

CREATE INDEX "leave_requests_organization_id_user_id_idx" ON "leave_requests"("organization_id", "user_id");

ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
