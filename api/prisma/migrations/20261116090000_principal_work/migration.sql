-- The payments tracker and the weekly institutional digest (Fatima, increment 6b). Additive only.
CREATE TABLE "payment_tracker_lines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "line_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "payment_key" TEXT NOT NULL,
    "payee" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "amount" DECIMAL(18,2),
    "currency" TEXT,
    "owner" TEXT,
    "due_on" DATE,
    "stated_status" TEXT,
    "stated_approval" TEXT,
    "evidence" TEXT,
    "raw_row" JSONB NOT NULL,
    "sent_by_user_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_tracker_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_tracker_lines_principal_user_id_line_key_key" ON "payment_tracker_lines"("principal_user_id", "line_key");
CREATE INDEX "payment_tracker_lines_principal_user_id_payment_key_idx" ON "payment_tracker_lines"("principal_user_id", "payment_key");

CREATE TABLE "weekly_digests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "week_key" TEXT NOT NULL,
    "report_date" DATE,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "content_hash" TEXT NOT NULL,
    "from_file" TEXT,
    "sent_by_user_id" TEXT,
    "developments" JSONB NOT NULL,
    "follow_ups" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "weekly_digests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "weekly_digests_principal_user_id_institution_week_key_key" ON "weekly_digests"("principal_user_id", "institution", "week_key");
