-- How the assistant appears inside a customer's own application.
--
-- Their login is the only login: their server mints a short-lived identity token, the widget
-- exchanges it for a Groundwork session, and no end user ever has a Groundwork password.
--
-- An empty allowed_domains list means the panel renders nowhere, which is the safe direction for a
-- setting somebody has not finished filling in.

CREATE TABLE "embed_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "signing_secret" TEXT NOT NULL,
    "allowed_domains" TEXT[],
    "placement" TEXT NOT NULL DEFAULT 'floating',
    "out_of_scope_departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embed_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "embed_configs_organization_id_key" ON "embed_configs"("organization_id");

ALTER TABLE "embed_configs" ADD CONSTRAINT "embed_configs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
