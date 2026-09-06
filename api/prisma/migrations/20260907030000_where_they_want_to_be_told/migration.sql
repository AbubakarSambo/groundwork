-- Where an organisation wants to be told things, outside this product. Slack
-- first, Teams next. The URL is a secret and is never returned by a read.
CREATE TYPE "WorkspaceKind" AS ENUM ('SLACK', 'TEAMS');

CREATE TABLE "workspace_notifiers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" "WorkspaceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "channel_said" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_posted_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_notifiers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_notifiers_organization_id_kind_key" ON "workspace_notifiers"("organization_id", "kind");

ALTER TABLE "workspace_notifiers" ADD CONSTRAINT "workspace_notifiers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
