-- It lived on the front of the text and leaked onto a page twice. New rows keep the text clean;
-- old rows keep the marker and the readers parse it as a fallback.
CREATE TYPE "Verifiability" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
ALTER TABLE "record_entries" ADD COLUMN "verifiability" "Verifiability";
