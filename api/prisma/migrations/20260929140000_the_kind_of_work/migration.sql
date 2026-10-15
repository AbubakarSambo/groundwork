-- Request 76: the kind of work of each check-in, the organisation's own stage names, and the records each kind's board needs. Adds three nullable columns and one table; changes no data.
ALTER TABLE "grounds" ADD COLUMN "kind_of_work" TEXT;
ALTER TABLE "grounds" ADD COLUMN "kind_of_work_set_by" TEXT;
ALTER TABLE "grounds" ADD COLUMN "work_stages" JSONB;

CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT,
    "owner_participant_id" TEXT,
    "due_at" TIMESTAMP(3),
    "fields" JSONB,
    "source_entry_id" TEXT,
    "added_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "work_items_ground_id_kind_idx" ON "work_items"("ground_id", "kind");
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
