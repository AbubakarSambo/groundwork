import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * A MIGRATION THAT WORKS ON MY DATABASE AND NOT ON AN EMPTY ONE.
 *
 * `ALTER TYPE "InteractionKind" ADD VALUE 'MERGE'` applied cleanly here and failed in CI with
 * `type "InteractionKind" does not exist`. Both are true: locally the type had been created minutes
 * earlier by hand, so the ALTER met a type that was already there. CI replays the folder in name
 * order onto an empty database, and the migration that CREATES that type sorts eleven minutes
 * LATER than the one altering it - because I stamped each file with the clock at the moment I wrote
 * it, and I wrote them out of order.
 *
 * The whole point of `migrate deploy` is that the folder replays from nothing. A migration that
 * only works against a database which already has the thing it changes is not a migration.
 *
 * This is cheap and static: for every ALTER TYPE, the CREATE TYPE has to sort before it.
 */
const DIR = join(__dirname, '..', '..', 'prisma', 'migrations');

interface Step { folder: string; sql: string }

function everyMigration(): Step[] {
  return readdirSync(DIR)
    .filter((f) => !f.startsWith('.') && f !== 'migration_lock.toml')
    .sort()
    .map((folder) => {
      let sql = '';
      try { sql = readFileSync(join(DIR, folder, 'migration.sql'), 'utf8'); } catch { /* empty folder */ }
      /*
       * COMMENTS STRIPPED, which the repository requires of every source-assertion spec and which
       * is also just correct here: a `-- CREATE TYPE "Foo"` in a note explaining a migration does
       * not create anything, and counting it would vouch for an ALTER that has nothing to alter.
       */
      sql = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, '');
      return { folder, sql };
    });
}

describe('a migration cannot run before the thing it alters exists', () => {
  const steps = everyMigration();

  it('finds the migrations, so an empty list cannot pass', () => {
    expect(steps.length).toBeGreaterThan(10);
  });

  it('creates every type before any migration alters it', () => {
    const createdBy = new Map<string, number>();
    steps.forEach((s, i) => {
      for (const m of s.sql.matchAll(/CREATE TYPE\s+"([^"]+)"/gi)) {
        if (!createdBy.has(m[1])) createdBy.set(m[1], i);
      }
    });

    const broken: string[] = [];
    steps.forEach((s, i) => {
      for (const m of s.sql.matchAll(/ALTER TYPE\s+"([^"]+)"/gi)) {
        const created = createdBy.get(m[1]);
        if (created === undefined || created > i) {
          broken.push(`${s.folder} alters "${m[1]}", created ${created === undefined ? 'nowhere' : `later in ${steps[created].folder}`}`);
        }
      }
    });
    expect(broken).toEqual([]);
  });

  it('creates every table before any migration alters it', () => {
    /* The same mistake, one noun over. A stamped-out-of-order ALTER TABLE fails identically. */
    const createdBy = new Map<string, number>();
    steps.forEach((s, i) => {
      for (const m of s.sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/gi)) {
        if (!createdBy.has(m[1])) createdBy.set(m[1], i);
      }
    });

    const broken: string[] = [];
    steps.forEach((s, i) => {
      for (const m of s.sql.matchAll(/ALTER TABLE(?:\s+IF EXISTS)?\s+"([^"]+)"/gi)) {
        const created = createdBy.get(m[1]);
        /* Created nowhere is fine here: plenty of tables predate the first migration in this folder. */
        if (created !== undefined && created > i) {
          broken.push(`${s.folder} alters "${m[1]}" before ${steps[created].folder} creates it`);
        }
      }
    });
    expect(broken).toEqual([]);
  });
});
