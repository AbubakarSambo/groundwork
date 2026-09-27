-- EQUIPMENT (U.17, E10). One new table, empty until used: each piece of equipment, who has it, and how it
-- is. Nothing existing is altered.
CREATE TABLE "equipment_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "holder_external_id" TEXT,
    "condition" VARCHAR(300),
    "updated_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "equipment_items_organization_id_name_key" ON "equipment_items"("organization_id", "name");

ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

