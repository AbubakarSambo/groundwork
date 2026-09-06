-- Something somebody has to do, from a term both sides agreed the reading of.
-- No state here means breached. And signing is kept apart from agreeing on a
-- version, because they are different moments that people collapse constantly.
ALTER TABLE "agreement_versions" ADD COLUMN "signed_at" TIMESTAMP(3);
ALTER TABLE "agreement_versions" ADD COLUMN "signed_said" TEXT;

CREATE TABLE "obligations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "term_id" TEXT NOT NULL,
    "says" TEXT NOT NULL,
    "whose" TEXT NOT NULL,
    "due_on" DATE,
    "state" TEXT NOT NULL DEFAULT 'not due yet',
    "accounts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "obligations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "obligations_ground_id_state_idx" ON "obligations"("ground_id", "state");
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
