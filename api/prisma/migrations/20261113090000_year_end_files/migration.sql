-- The year-end drafts and what happened to them, who may receive the files, and the files a held mail carries. Additive only.
ALTER TABLE "scheduled_emails" ADD COLUMN "attachments" JSONB;

CREATE TABLE "year_end_drafts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "content" JSONB NOT NULL,
    "change_note" TEXT,
    "changed_by_user_id" TEXT,
    "channel" TEXT,
    "parent_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "year_end_drafts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "year_end_drafts_organization_id_principal_user_id_year_version_key" ON "year_end_drafts"("organization_id", "principal_user_id", "year", "version");

CREATE TABLE "year_end_log" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "version" INTEGER,
    "recipient" TEXT,
    "detail" TEXT,
    "data" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "year_end_log_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "year_end_log_principal_user_id_kind_subject_key" ON "year_end_log"("principal_user_id", "kind", "subject");
CREATE INDEX "year_end_log_principal_user_id_at_idx" ON "year_end_log"("principal_user_id", "at");

CREATE TABLE "year_end_recipients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "confirmed_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "year_end_recipients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "year_end_recipients_principal_user_id_email_key" ON "year_end_recipients"("principal_user_id", "email");
