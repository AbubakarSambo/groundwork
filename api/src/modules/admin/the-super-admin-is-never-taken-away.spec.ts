import * as fs from 'fs';
import * as path from 'path';

/**
 * HJUMARE@GMAIL.COM IS A PLATFORM ADMIN (SUPER ADMIN), AND NO RELEASE TAKES IT AWAY.
 *
 * On the live product this is data: `users.is_platform_admin` is true on that person's row (set by the
 * one-time bootstrap or by "add admin"), and every staff door reads that column (the platform admin guard,
 * the back-office door, /admin, /ops, the prompts and billing back-office pages). Nothing in the code
 * names an address. So the one thing that can lose it is a migration or a script that changes the column or
 * the row, and the one thing that can put it back is a migration that only ever adds.
 *
 * This reads every migration on the branch. It fails if any of them turns the flag off, drops the column
 * or the table, or deletes users, and it fails if the migration that keeps Hafsah's address a platform
 * admin is missing, does anything but add, or is not listed in docs/deploy.md.
 */
const MIGRATIONS = path.join(__dirname, '..', '..', '..', 'prisma', 'migrations');
const ALL = fs.readdirSync(MIGRATIONS).filter((n) => /^\d{14}_/.test(n)).sort();
const sqlOf = (name: string) =>
  fs.readFileSync(path.join(MIGRATIONS, name, 'migration.sql'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

const THE_KEEPER = '20261007233000_hafsah_stays_a_platform_admin';

describe('the migration that keeps the super admin', () => {
  it('exists', () => {
    expect(ALL).toContain(THE_KEEPER);
  });

  it('sets the flag to true on the row with that address, and does nothing else', () => {
    const sql = sqlOf(THE_KEEPER).replace(/\s+/g, ' ').trim();
    expect(sql).toBe(
      `UPDATE "users" SET "is_platform_admin" = true WHERE lower("email") = 'hjumare@gmail.com' AND "is_platform_admin" = false AND "deleted_at" IS NULL;`,
    );
  });

  it('is listed in docs/deploy.md as a release step with its check', () => {
    const doc = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'docs', 'deploy.md'), 'utf8');
    expect(doc).toContain(THE_KEEPER);
    expect(doc).toMatch(/Check the super admin/);
  });
});

describe('no migration on this branch can take staff access away', () => {
  it.each(ALL)('%s does not turn the flag off, drop it, or delete users', (name) => {
    const sql = sqlOf(name);
    /* Only what a statement SETS counts; "WHERE is_platform_admin = false" is a filter, not a change. */
    for (const statement of sql.split(';')) {
      const sets = /\bSET\b([\s\S]*?)(\bWHERE\b|\bFROM\b|$)/i.exec(statement)?.[1] ?? '';
      expect(sets).not.toMatch(/"?is_platform_admin"?\s*=\s*false/i);
    }
    expect(sql).not.toMatch(/DROP\s+COLUMN\s+(IF EXISTS\s+)?"?is_platform_admin"?/i);
    expect(sql).not.toMatch(/DROP\s+TABLE\s+(IF EXISTS\s+)?"?users"?\b/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"?users"?\b/i);
    expect(sql).not.toMatch(/TRUNCATE[^;]*"?users"?\b/i);
  });
});
