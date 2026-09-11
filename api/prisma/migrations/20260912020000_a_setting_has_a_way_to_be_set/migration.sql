-- A SETTING HAS A WAY TO BE SET, OR IT IS A CONSTANT. Six things a row-only-SQL-could-create sat
-- behind (fix plan B12). Two platform settings gained PATCH routes and need no schema change. The
-- rest either had no reader, no writer, or neither:
--
--   organizations.contributor_bypass    referenced nowhere, said so in its own comment
--   check_ins.recall_confidence         written null since 2026-09-11: specificity under a second name
--   pattern_configs                     read, never written - every detection ran on the code defaults
--   org_intelligence                    written by a weekly model call, never read by anything
--
-- retention_policies stays and gains a writer (PATCH /org/retention). documents_elsewhere stays: its
-- own design note says it is unread by text assembly on purpose. knowledge_retrievals stays: it is
-- the trace of which cards produced an answer, read by a person asking "why did it say that".
-- No backfill: nothing read any of what goes.
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "contributor_bypass";
ALTER TABLE "check_ins" DROP COLUMN IF EXISTS "recall_confidence";
DROP TABLE IF EXISTS "pattern_configs";
DROP TABLE IF EXISTS "org_intelligence";
