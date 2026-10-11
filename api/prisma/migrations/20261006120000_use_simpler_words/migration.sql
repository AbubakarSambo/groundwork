-- "Use simpler words": a check-in setting, off for every check-in that exists. Only a column is added.
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "simpler_words" BOOLEAN NOT NULL DEFAULT false;
