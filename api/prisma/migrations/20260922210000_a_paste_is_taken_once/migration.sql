-- A paste is taken once. Its hash is kept on a full yes; a second yes to the same text writes
-- nothing. A partial yes is deliberately not recorded, because the part left out may be taken later.
CREATE TABLE "ground_pastes" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ground_pastes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ground_pastes_ground_id_hash_key" ON "ground_pastes"("ground_id", "hash");

ALTER TABLE "ground_pastes" ADD CONSTRAINT "ground_pastes_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
