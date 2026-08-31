CREATE TABLE "what_worked" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "by_participant_id" TEXT NOT NULL,
    "by_name" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "offered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "what_worked_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "what_worked_organization_id_idx" ON "what_worked"("organization_id");
ALTER TABLE "what_worked" ADD CONSTRAINT "what_worked_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "what_worked" ADD CONSTRAINT "what_worked_by_participant_id_fkey" FOREIGN KEY ("by_participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
