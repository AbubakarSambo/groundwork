ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "join_token" VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS "grounds_join_token_key" ON "grounds"("join_token");
