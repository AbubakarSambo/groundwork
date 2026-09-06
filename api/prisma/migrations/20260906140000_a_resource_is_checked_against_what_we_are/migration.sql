-- THE RESOURCE REGISTER.
--
-- What we put in front of people, and whether it matches what we sell.
--
-- `checked_against_version` is the point of the table: a sign-off is only
-- meaningful against a fixed set of words, so it records WHICH version of the
-- product statement it passed. Changing the statement then leaves every older
-- sign-off visibly stale rather than silently wrong.
CREATE TYPE "OpsResourceCategory" AS ENUM (
  'PITCH_DECK',
  'SALES_DECK',
  'CAMPAIGN_STRATEGY',
  'CAMPAIGN_CONTENT',
  'MARKETING_SITE_COPY',
  'NEWSLETTER',
  'OTHER'
);

ALTER TYPE "OpsApprovalType" ADD VALUE 'RESOURCE';

CREATE TABLE "ops_resources" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "OpsResourceCategory" NOT NULL,
  "category_detail" TEXT,
  "url" TEXT,
  "content" TEXT NOT NULL,
  "added_by_id" TEXT NOT NULL,
  "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checks" JSONB,
  "checked_against_version" INTEGER,
  "checked_at" TIMESTAMP(3),
  "check_says" TEXT,
  "risks" TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ops_resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ops_resources_category_idx" ON "ops_resources"("category");
