-- What we say this product is, and what it is not.
--
-- The statement every piece of marketing is held up against. It lived in slide
-- three of the sales deck, which is inside one of the documents it governs.
--
-- Append-only: a sign-off records the version it was checked against, so a
-- change reopens everything signed against the old one — computable only while
-- the old one still exists.
CREATE TABLE "ops_product_statements" (
  "id"            TEXT NOT NULL,
  "version"       INTEGER NOT NULL,
  "headline"      TEXT NOT NULL,
  "said_out_loud" TEXT NOT NULL,
  "is_it"         TEXT[],
  "is_not_it"     TEXT[],
  "written_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "written_by"    TEXT,
  "because"       TEXT,
  CONSTRAINT "ops_product_statements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ops_product_statements_version_key" ON "ops_product_statements"("version");
CREATE INDEX "ops_product_statements_version_idx" ON "ops_product_statements"("version");
