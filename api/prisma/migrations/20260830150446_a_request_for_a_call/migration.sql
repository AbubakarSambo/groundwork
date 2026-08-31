-- CreateTable
CREATE TABLE "call_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_requests_status_created_at_idx" ON "call_requests"("status", "created_at");

-- AddForeignKey
ALTER TABLE "call_requests" ADD CONSTRAINT "call_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

