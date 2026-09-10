-- A line the model has worded once is kept, so a report read costs a lookup and not a model call.
CREATE TABLE "worded_lines" (
  "key" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worded_lines_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "worded_lines_created_at_idx" ON "worded_lines"("created_at");
