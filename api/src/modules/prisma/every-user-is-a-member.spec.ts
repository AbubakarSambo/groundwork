import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * THE MULTI-ORGANISATION FEATURE WORKED ONLY FOR USERS WHO PREDATED IT.
 *
 * `OrganizationMembership` arrived with a migration that backfilled every user who existed that day.
 * No code was ever written to create one. So `/auth/my-organizations` returned an empty list, and
 * `/auth/switch-organization` had no row to find, for **every user created since** - routes, reads
 * and a migration, all correct, all dead for anybody who signed up after.
 *
 * Nothing failed. Nothing logged. The counts even looked right: five users, five memberships, because
 * the only users left were the backfilled ones.
 *
 * Found by signing a user up through the real flow and counting their membership rows. Zero.
 *
 * THE FIX IS ONE HOOK, NOT NINE EDITS. There are nine `user.create` calls across four services, and
 * the reason this broke is precisely that a dependent row had to be remembered somewhere far from the
 * rule. Patching nine sites leaves the tenth, written next month, silently broken the same way.
 */
const PRISMA = readFileSync(join(__dirname, 'prisma.service.ts'), 'utf8');
const CODE = PRISMA.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the membership follows the user', () => {
  it('there is a hook on user creation', () => {
    expect(CODE).toMatch(/membershipFollowsTheUser\(\)/);
    expect(CODE).toMatch(/params\.model !== 'User' \|\| params\.action !== 'create'/);
  });

  it('and it runs before connecting, so no create can slip past it', () => {
    const init = CODE.slice(CODE.indexOf('async onModuleInit()'), CODE.indexOf('async onModuleDestroy()'));
    expect(init.indexOf('this.membershipFollowsTheUser()')).toBeLessThan(init.indexOf('this.$connect()'));
  });

  it('the membership is nested into the create rather than written after it', () => {
    /**
     * THE PART THAT COST ME AN ITERATION. My first version let the user be created and then upserted
     * the membership, which failed on every single sign-up and logged it quietly: all nine callers
     * run inside a `$transaction`, so on any other connection the user row does not exist yet and the
     * dependent write has nothing to point at.
     *
     * Nesting it means Prisma issues both inside whatever transaction the caller already has.
     */
    expect(CODE).toMatch(/memberships: \{ create: \{ organizationId: orgId/);
    expect(CODE).toMatch(/params\.args\.data = \{/);
    /** And no separate write, which is the shape that silently did nothing. */
    expect(CODE).not.toMatch(/organizationMembership\.upsert/);
  });

  it('it reads the org whether it was given as an id or a connect', () => {
    // Both forms are in use across the nine callers, and missing one is a user with no membership.
    expect(CODE).toMatch(/data\?\.organizationId \?\? data\?\.organization\?\.connect\?\.id/);
  });

  it('and a caller that builds its own memberships is left alone', () => {
    expect(CODE).toMatch(/&& !data\.memberships/);
  });

  it('the role carries over rather than defaulting silently', () => {
    // An admin whose membership says MEMBER is a permissions bug waiting on the switcher.
    expect(CODE).toMatch(/role: data\.role \?\? 'MEMBER'/);
  });
});

describe('and everybody who signed up in between was caught up', () => {
  const dir = join(__dirname, '../../../prisma/migrations');

  it('a second backfill exists, scoped to users without one', () => {
    const names = readdirSync(dir);
    const backfill = names.find(n => n.includes('membership_for_users_since'));
    expect(backfill).toBeTruthy();
    const sql = readFileSync(join(dir, backfill!, 'migration.sql'), 'utf8');
    expect(sql).toMatch(/WHERE NOT EXISTS/);
    expect(sql).toMatch(/ON CONFLICT \("user_id", "organization_id"\) DO NOTHING/);
  });

  it('and the first backfill is still there, because it is what this one is repairing', () => {
    // Deleting it would erase the reason the second exists.
    expect(readdirSync(dir).some(n => n.includes('organization_memberships'))).toBe(true);
  });
});
