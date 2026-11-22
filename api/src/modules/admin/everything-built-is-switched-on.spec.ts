import { readFileSync } from 'fs';
import { join } from 'path';
import { THE_ORGANISATION_SWITCHES } from './the-organisation-switches';

/**
 * EVERYTHING BUILT IS SWITCHED ON (Hafsah, 22 November 2026: "everything build should be switched on"). Every release switch and the
 * new designs default on, every organisation already here is switched on by the migration with no manual step, and staff can still
 * switch one off for one organisation in Admin.
 */
const schema = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');
const migration = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'migrations', '20261122120000_everything_built_is_switched_on', 'migration.sql'), 'utf8');
const org = schema.slice(schema.indexOf('model Organization {'), schema.indexOf('\n}', schema.indexOf('model Organization {')));

describe('everything built is switched on', () => {
  it('every switch staff can set defaults on for a new organisation', () => {
    for (const { key } of THE_ORGANISATION_SWITCHES) expect(org).toMatch(new RegExp(`\\n  ${key}\\s+Boolean\\s+@default\\(true\\)`));
  });

  it('the new designs are one of them, a column on the organisation', () => {
    expect(THE_ORGANISATION_SWITCHES.map((s) => s.key)).toContain('designPassOn');
    expect(org).toContain('designPassOn           Boolean   @default(true) @map("design_pass_on")');
  });

  it('the migration only adds and switches on: one column, new defaults, and every organisation already here set on', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "design_pass_on" BOOLEAN NOT NULL DEFAULT true');
    expect(migration).not.toMatch(/DROP|DELETE|RENAME/i);
    for (const c of ['release_1_sales_board_on', 'release_2_collections_on', 'release_3_invoices_on', 'invoices_after_a_sale_on', 'release_4_teams_on', 'release_5_projects_on', 'release_6_direction_on', 'release_7_people_on', 'release_8_situations_on', 'release_9_policy_on']) {
      expect(migration).toContain(`ALTER COLUMN "${c}" SET DEFAULT true`);
      expect(migration).toMatch(new RegExp(`"${c}" = true`));
    }
  });

  it('the session serves the organisation\'s design setting, so the screen needs no ?design=on', () => {
    const auth = readFileSync(join(__dirname, '..', 'auth', 'auth.service.ts'), 'utf8');
    expect(auth).toMatch(/designPassOn: \(user\.organization as \{ designPassOn\?: boolean \}\)\.designPassOn !== false/);
  });
});
