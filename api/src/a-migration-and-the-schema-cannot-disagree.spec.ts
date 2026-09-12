import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * A COLUMN THE DATABASE HAS AND THE MODEL DOES NOT IS INVISIBLE TO EVERY OTHER TEST HERE.
 *
 * Twice in one session: a migration adding a column went in while the edit adding the field to the
 * model silently did not apply. The migration runs, the column exists, and nothing can write to it.
 * Every suite passes, because no test reaches a column no code can name - and the product carries a
 * feature that quietly does nothing until somebody looks.
 *
 * This reads the migrations for added columns and checks the schema has a field mapped to each. It
 * is deliberately narrow: ADD COLUMN on a table only. Anything cleverer would be a SQL parser, and
 * a SQL parser in a test file is how a guard becomes the thing that breaks.
 */
const MIGRATIONS = join(__dirname, '..', 'prisma', 'migrations');
/*
 * COMMENTS STRIPPED FIRST, as every source-assertion spec here must. A doc comment in the schema
 * that happened to quote `@map("some_column")` - which the comments in this very repository do,
 * constantly, because they explain the mapping - would satisfy an assertion about the model while
 * the field was missing. That is exactly the failure this file exists to catch, in this file.
 */
const SCHEMA = readFileSync(join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

/*
 * And SQL comments go too, for the same reason in the other direction: every migration in this
 * repository opens with a paragraph explaining itself, and one that quotes the statement it is
 * about would be read as a column the database has.
 */
const withoutSqlComments = (sql: string) => sql.replace(/--.*$/gm, '');

/** Columns Prisma manages itself, which never appear as a field. */
const NOT_A_FIELD = new Set(['created_at', 'updated_at']);

/**
 * Added and never dropped since.
 *
 * Migrations are kept for ever, so a column added in June and dropped in August is not a
 * disagreement - it is history. Dropping is tracked across the whole set rather than per file,
 * because the drop is almost always in a later migration than the add.
 */
function addedColumns(): { file: string; column: string }[] {
  const added: { file: string; column: string }[] = [];
  const dropped = new Set<string>();
  for (const dir of readdirSync(MIGRATIONS).sort()) {
    const path = join(MIGRATIONS, dir, 'migration.sql');
    let sql = '';
    try { sql = withoutSqlComments(readFileSync(path, 'utf8')); } catch { continue; }
    for (const m of sql.matchAll(/ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"([\w]+)"/gi)) {
      if (!NOT_A_FIELD.has(m[1])) added.push({ file: dir, column: m[1] });
    }
    for (const m of sql.matchAll(/DROP COLUMN\s+(?:IF EXISTS\s+)?"?([\w]+)"?/gi)) dropped.add(m[1]);
  }
  return added.filter((a) => !dropped.has(a.column));
}

describe('a migration and the schema cannot disagree', () => {
  it('found migrations, or this test proves nothing', () => {
    expect(addedColumns().length).toBeGreaterThan(5);
  });

  it('every column a migration added is a field the model can name', () => {
    /*
     * Matched on the @map, which is how a snake_case column reaches a camelCase field, or on the
     * bare name where the two are the same. A dropped column is not chased: migrations are kept
     * for ever and a column removed later is not a disagreement.
     */
    const missing = addedColumns().filter(({ column }) => {
      if (SCHEMA.includes(`@map("${column}")`)) return false;
      /* A field whose name is already the column name needs no @map. */
      return !new RegExp(`^\\s+${column}\\s`, 'm').test(SCHEMA);
    });
    /*
     * If this fails: these columns exist in the database and no model field names them. Nothing can
     * read or write one, and no other test can see it - a suite cannot reach a column no code can
     * mention. Either add the field to schema.prisma, or drop the column in a new migration.
     */
    expect(missing).toEqual([]);
  });
});
