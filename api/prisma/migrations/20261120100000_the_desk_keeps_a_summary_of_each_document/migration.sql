-- 20 November 2026. Add-only.
-- The Desk (S7): each organisation document's title, who added it, and the summary written when it was added.
-- The document's words stay in knowledge_cards; this table never holds them.
CREATE TABLE "desk_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "text_hash" VARCHAR(64) NOT NULL,
    "source_ref" TEXT,
    "added_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "desk_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "desk_documents_organization_id_key_key" ON "desk_documents"("organization_id", "key");
ALTER TABLE "desk_documents" ADD CONSTRAINT "desk_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
