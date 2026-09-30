-- REQUEST 17 (D2). The company page's company-wide picture, written once when the record changes and
-- stored without names. One row per organisation. Nothing existing changes.
CREATE TABLE "company_pictures" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "readings" JSONB NOT NULL,
    "not_reaching" JSONB NOT NULL,
    "named_by_teams" JSONB NOT NULL,
    "said_and_shown" JSONB NOT NULL,
    "input_key" TEXT NOT NULL,
    "prompt_version_id" TEXT,
    "built_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pictures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_pictures_organization_id_key" ON "company_pictures"("organization_id");
