-- A COLUMN WAS RENAMED AND ITS INDEX KEPT THE OLD NAME.
--
-- 20260912060000_one_integer_one_name renamed round_completions.round_number to
-- session_number. Postgres renames the column and leaves the unique index under the
-- name it was created with, so the database held
-- round_completions_ground_id_round_number_key while the schema declared
-- round_completions_ground_id_session_number_key.
--
-- Nothing was broken by it: the index is the same index and it does the same job. But
-- the two no longer agreed, so `prisma migrate diff` reported drift on every run and
-- the "migrations match the schema" check failed on a clean database. Found by
-- deploying all 257 migrations into an empty one.
--
-- IF NOT EXISTS on the source and a guard on the target, so this is safe on a database
-- that was built before the rename and on one that was built after it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'round_completions_ground_id_round_number_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'round_completions_ground_id_session_number_key') THEN
    ALTER INDEX "round_completions_ground_id_round_number_key"
      RENAME TO "round_completions_ground_id_session_number_key";
  END IF;
END $$;

-- THE SAME RENAME LEFT TWO MORE INDEXES BEHIND, on report_rounds, where `round`
-- became `session_number` in the same migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'report_rounds_ground_id_round_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'report_rounds_ground_id_session_number_idx') THEN
    ALTER INDEX "report_rounds_ground_id_round_idx" RENAME TO "report_rounds_ground_id_session_number_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'report_rounds_ground_id_round_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'report_rounds_ground_id_session_number_key') THEN
    ALTER INDEX "report_rounds_ground_id_round_key" RENAME TO "report_rounds_ground_id_session_number_key";
  END IF;
END $$;

-- AND A DEFAULT THE SCHEMA STOPPED DECLARING. reports.updated_at is @updatedAt, which
-- Prisma writes from the application on every save, so the column is not meant to carry
-- a database default. One was left on it by an older migration. Dropping it changes no
-- value that is ever written: every insert and update already supplies the timestamp.
ALTER TABLE "reports" ALTER COLUMN "updated_at" DROP DEFAULT;
