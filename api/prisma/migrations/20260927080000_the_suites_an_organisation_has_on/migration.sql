-- THE SUITES AN ORGANISATION HAS SWITCHED ON (U.17, E). A new table, empty until an admin switches a
-- suite on. One row per suite, with the admin's answers to its first questions. No row means off.
-- Nothing existing is altered.
CREATE TABLE "organization_suites" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "suite" VARCHAR(24) NOT NULL,
    "is_on" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "changed_by_id" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_suites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_suites_organization_id_suite_key" ON "organization_suites"("organization_id", "suite");

ALTER TABLE "organization_suites" ADD CONSTRAINT "organization_suites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
