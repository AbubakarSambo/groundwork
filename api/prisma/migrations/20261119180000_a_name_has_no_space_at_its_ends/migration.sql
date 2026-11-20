-- A name has no space at its ends (Hafsah's screenshot of 19 November 2026: "We save this for you, Clinton .").
-- New writes are trimmed in the database client (a-name-has-no-space-at-its-ends.ts). This puts right the names already stored.
-- It changes only rows that have a space at an end, and running it twice changes nothing.
UPDATE "users"
SET "first_name" = btrim("first_name"), "last_name" = btrim("last_name")
WHERE "first_name" <> btrim("first_name") OR "last_name" <> btrim("last_name");
