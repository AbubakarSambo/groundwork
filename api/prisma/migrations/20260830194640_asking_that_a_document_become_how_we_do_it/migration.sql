-- CreateTable
CREATE TABLE "knowledge_proposals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "proposed_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "card_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_proposals_organization_id_status_idx" ON "knowledge_proposals"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_proposals_document_id_status_key" ON "knowledge_proposals"("document_id", "status");

-- AddForeignKey
ALTER TABLE "knowledge_proposals" ADD CONSTRAINT "knowledge_proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_proposals" ADD CONSTRAINT "knowledge_proposals_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ground_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

