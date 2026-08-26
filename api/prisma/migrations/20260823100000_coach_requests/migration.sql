-- Somebody asking to speak to a coach before they open anything.
--
-- Additive: a new table, no change to any existing one. Nothing reads it until the card and the
-- back-office section exist, so this can land ahead of either.
CREATE TABLE "coach_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "org_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "team_size" TEXT NOT NULL,
    "intention" TEXT NOT NULL,
    "tried_already" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'new',
    "confirmation_sent_at" TIMESTAMP(3),
    "is_free_mail" BOOLEAN NOT NULL DEFAULT false,
    "asked_again_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coach_requests_status_created_at_idx" ON "coach_requests"("status", "created_at");
CREATE INDEX "coach_requests_email_idx" ON "coach_requests"("email");
