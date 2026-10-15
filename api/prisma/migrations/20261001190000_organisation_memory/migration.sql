-- WEEK 20. What a lead confirmed is true of the whole company. Nothing existing changes; the table is new and empty.
CREATE TABLE "organization_memories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ground_id" TEXT,
    "kind" VARCHAR(16) NOT NULL,
    "text" TEXT NOT NULL,
    "status" VARCHAR(8) NOT NULL DEFAULT 'OFFERED',
    "offered_by_id" TEXT NOT NULL,
    "source_line" TEXT NOT NULL,
    "offered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kept_by_id" TEXT,
    "kept_at" TIMESTAMP(3),
    CONSTRAINT "organization_memories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "organization_memories_organization_id_status_idx" ON "organization_memories"("organization_id", "status");
ALTER TABLE "organization_memories" ADD CONSTRAINT "organization_memories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
