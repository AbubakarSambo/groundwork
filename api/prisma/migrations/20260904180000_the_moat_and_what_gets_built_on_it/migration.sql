-- CreateTable
CREATE TABLE "ops_moat_components" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "statement" TEXT NOT NULL,

    CONSTRAINT "ops_moat_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_moat_entries" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidence_url" TEXT,
    "related_record_type" TEXT,
    "related_record_id" TEXT,
    "built_by_id" TEXT,
    "built_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_moat_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ops_moat_components_key_key" ON "ops_moat_components"("key");

-- CreateIndex
CREATE INDEX "ops_moat_entries_component_id_built_at_idx" ON "ops_moat_entries"("component_id", "built_at");

-- AddForeignKey
ALTER TABLE "ops_moat_entries" ADD CONSTRAINT "ops_moat_entries_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "ops_moat_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

