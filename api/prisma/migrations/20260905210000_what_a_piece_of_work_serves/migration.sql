-- What a piece of work serves, declared when it is proposed.
--
-- One table for roadmap, tech and UX items rather than four columns on each of
-- three models: the rule lives in one place, and "work that named nothing"
-- becomes a join rather than three queries that have to agree.
--
-- Nothing here blocks. An item naming nothing is listed.
CREATE TYPE "OpsServes" AS ENUM ('SALES', 'MOAT', 'UNLOCKS_A_CUSTOMER', 'KEEPING_IT_UP');

CREATE TABLE "ops_what_it_serves" (
  "id"                   TEXT NOT NULL,
  "record_type"          TEXT NOT NULL,
  "record_id"            TEXT NOT NULL,
  "serves"               "OpsServes" NOT NULL,
  "serves_record_id"     TEXT,
  "justification"        TEXT NOT NULL,
  "depends_on"           TEXT,
  "depends_on_owned_by"  TEXT,
  "declared_by_id"       TEXT NOT NULL,
  "declared_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ops_what_it_serves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ops_what_it_serves_record_type_record_id_key"
  ON "ops_what_it_serves"("record_type", "record_id");
CREATE INDEX "ops_what_it_serves_serves_idx" ON "ops_what_it_serves"("serves");
