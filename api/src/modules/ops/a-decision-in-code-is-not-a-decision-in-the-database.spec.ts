/**
 * A DEFAULT CHANGED IN CODE REACHES ONLY A FRESH INSTALL.
 *
 * `display.timezone` was `America/New_York` with a note saying the decision was
 * still open. It was decided — the boards date themselves where the company is
 * run from — and changing SETTING_DEFAULTS looked like the whole fix. It was
 * not: `get` falls back to the default only when no row exists, and the seed had
 * written one. The running system kept answering New York.
 *
 * The same shape as the capability roll-out, and the same lesson: settings and
 * grants live in the database, so a decision has to be written there too.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { OPS_SETTINGS, SETTING_DEFAULTS } from './ops-settings.service';

const MIGRATIONS = join(__dirname, '..', '..', '..', 'prisma', 'migrations');

const everyMigration = () =>
  readdirSync(MIGRATIONS)
    .filter((d) => !d.endsWith('.toml'))
    .map((d) => readFileSync(join(MIGRATIONS, d, 'migration.sql'), 'utf8'))
    .join('\n');

describe('the timezone the boards date themselves by', () => {
  it('is where the company is run from, in the code', () => {
    expect(SETTING_DEFAULTS[OPS_SETTINGS.displayTimezone].value).toBe('Africa/Lagos');
  });

  it('no longer says a decision is awaited, because one was made', () => {
    expect(SETTING_DEFAULTS[OPS_SETTINGS.displayTimezone].note).not.toMatch(/awaiting a decision/i);
  });

  it('and the row already in the database was moved too', () => {
    const sql = everyMigration();
    expect(sql).toMatch(/UPDATE "ops_settings"[\s\S]*Africa\/Lagos/);
  });

  it('and that update leaves a timezone somebody chose themselves alone', () => {
    /* Guarded on the old value. Overwriting a real choice with ours would be a
       worse defect than the placeholder it replaces. */
    const sql = everyMigration();
    expect(sql).toMatch(/AND value = 'America\/New_York'/);
  });
});

describe('the settings page', () => {
  it('lists only keys this system will actually let somebody change', () => {
    /*
     * `set` refuses a key not in SETTING_DEFAULTS. The rolled-out capability
     * list is a record the system keeps for itself, and showing it on a page of
     * decisions offers a control that cannot do anything.
     */
    const source = readFileSync(join(__dirname, 'ops-settings.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(source).toMatch(/filter\(\(row\) => SETTING_DEFAULTS\[row\.key\] !== undefined\)/);
  });
});
