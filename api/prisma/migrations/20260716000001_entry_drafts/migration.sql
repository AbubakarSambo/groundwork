-- Server-side draft of an anonymous entry session (written at entry-save, the
-- ISSUE-17 consent moment). Makes the post-verification commit independent of
-- which browser opens the magic link.
CREATE TABLE "entry_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "draft_token" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "history" JSONB NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "ground_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entry_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entry_drafts_user_id_key" ON "entry_drafts"("user_id");
CREATE UNIQUE INDEX "entry_drafts_draft_token_key" ON "entry_drafts"("draft_token");

ALTER TABLE "entry_drafts" ADD CONSTRAINT "entry_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
