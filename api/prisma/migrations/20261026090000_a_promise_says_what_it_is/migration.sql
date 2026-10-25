-- A vague promise keeps what "it" is, in the person's own words. Add-only.
ALTER TABLE "ground_commitments" ADD COLUMN IF NOT EXISTS "what_it_is" TEXT;
