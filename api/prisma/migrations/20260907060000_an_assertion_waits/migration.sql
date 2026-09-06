-- What one side said, and whether the other has been asked. The claim never
-- reaches the other side; the neutral subject is all they are asked about.
CREATE TABLE "assertions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "the_other_side" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'said by one side',
    "asked" TEXT,
    "asked_at" TIMESTAMP(3),
    "their_account" TEXT,
    "answered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assertions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assertions_ground_id_state_idx" ON "assertions"("ground_id", "state");
ALTER TABLE "assertions" ADD CONSTRAINT "assertions_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
