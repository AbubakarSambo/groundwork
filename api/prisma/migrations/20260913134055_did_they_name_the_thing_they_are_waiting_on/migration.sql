-- Nullable: null is "we never asked", not "they did not name it". Rows written before this column
-- fall back to the word-list rule at the read.
ALTER TABLE "ground_dependencies" ADD COLUMN "named_the_thing" BOOLEAN;
