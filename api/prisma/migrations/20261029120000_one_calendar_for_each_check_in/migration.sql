-- One calendar for each check-in (29 October 2026): Monday to Friday unless the lead says otherwise, never empty.
ALTER TABLE "grounds" ALTER COLUMN "working_days" SET DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];
UPDATE "grounds" SET "working_days" = ARRAY[1, 2, 3, 4, 5]::INTEGER[] WHERE "working_days" = '{}' OR "working_days" IS NULL;
