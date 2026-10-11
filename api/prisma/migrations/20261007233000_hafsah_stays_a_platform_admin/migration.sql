-- Hafsah's own address stays a platform admin (super admin), exactly as on the live product.
-- It only ever ADDS: it sets the flag to true on the one row that has this address, and does nothing
-- when there is no such row, when the flag is already true, or when the row has been deleted.
-- It can be run again at any time. It never turns a flag off and never touches another row.
UPDATE "users"
SET "is_platform_admin" = true
WHERE lower("email") = 'hjumare@gmail.com'
  AND "is_platform_admin" = false
  AND "deleted_at" IS NULL;
