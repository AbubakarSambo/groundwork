-- A to-do is yours: a note to yourself, apart from a commitment made to somebody.
CREATE TYPE "TodoState" AS ENUM ('OPEN', 'DONE', 'DROPPED');
CREATE TABLE "todos" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "person_external_id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "due_said" TEXT,
  "due_at" TIMESTAMP(3),
  "state" "TodoState" NOT NULL DEFAULT 'OPEN',
  "source" TEXT NOT NULL DEFAULT 'chat',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "done_at" TIMESTAMP(3),
  CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "todos_organization_id_person_external_id_state_idx" ON "todos"("organization_id", "person_external_id", "state");
ALTER TABLE "todos" ADD CONSTRAINT "todos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
