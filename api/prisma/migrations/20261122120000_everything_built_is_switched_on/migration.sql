-- Everything built is switched on (Hafsah, 22 November 2026). Additive: one new column, new defaults, and every existing
-- organisation switched on, so nobody needs a manual step. Staff can still switch any of them off for one organisation in Admin.

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "design_pass_on" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "organizations" ALTER COLUMN "release_1_sales_board_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "release_2_collections_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "release_3_invoices_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "invoices_after_a_sale_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "release_4_teams_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "release_5_projects_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "release_6_direction_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "release_7_people_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "release_8_situations_on" SET DEFAULT true;
ALTER TABLE "organizations" ALTER COLUMN "release_9_policy_on" SET DEFAULT true;

UPDATE "organizations" SET
  "release_1_sales_board_on" = true,
  "release_2_collections_on" = true,
  "release_3_invoices_on" = true,
  "invoices_after_a_sale_on" = true,
  "release_4_teams_on" = true,
  "release_5_projects_on" = true,
  "release_6_direction_on" = true,
  "release_7_people_on" = true,
  "release_8_situations_on" = true,
  "release_9_policy_on" = true;
