import { readFileSync } from 'fs';
import { join } from 'path';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { theRelease2CollectionsIsOn, theRelease2CollectionsIsOnFor } from './release-2-collections';
import { AdminController } from '../admin/admin.controller';
import { AdminService } from '../admin/admin.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ONLY_A_TEST_ORGANISATION } from '../../../scripts/the-release-2-collections';

/**
 * RELEASE 2, COLLECT WHAT'S OWED, A SWITCH PER ORGANISATION (release plan, Release 2 and Part 0). Off for every organisation
 * already here and every new one, off when its row cannot be read, switched on by Groundwork staff alone, and by script only
 * for a "(test)" organisation.
 */
const API = join(__dirname, '..', '..', '..');
const MIGRATION = 'prisma/migrations/20261019230000_release_2_collections_switch/migration.sql';

describe('the switch is off for every organisation until it is switched on', () => {
  it('the migration only adds: one enum value, two organisation columns and two check-in columns, and can be run again', () => {
    const sql = readFileSync(join(API, MIGRATION), 'utf8');
    const statements = sql.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));
    expect(statements).toEqual([
      `ALTER TYPE "GroundScenario" ADD VALUE IF NOT EXISTS 'COLLECTIONS';`,
      'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_2_collections_on" BOOLEAN NOT NULL DEFAULT false;',
      'ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "bill_word" TEXT;',
      'ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "check_in_type" TEXT;',
      'ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "check_in_type_confirmed_at" TIMESTAMP(3);',
    ]);
    /* Nothing that changes, renames, removes or fills a row. */
    expect(sql).not.toMatch(/\b(UPDATE|DELETE|DROP|RENAME|TRUNCATE)\b/i);
    const schema = readFileSync(join(API, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('release2CollectionsOn  Boolean   @default(false) @map("release_2_collections_on")');
  });

  /* 15 November 2026 (Hafsah: everything has a board): the reader is always on. The column is no longer read, so a stored false, a missing row or a failed read no longer hides the collections board. */
  it('reads on whatever the organisation row says, or cannot say', async () => {
    const org = (row: any) => ({ organization: { findUnique: jest.fn(async () => row) } });
    expect(await theRelease2CollectionsIsOn(org({ release2CollectionsOn: true }), 'org-1')).toBe(true);
    expect(await theRelease2CollectionsIsOn(org({ release2CollectionsOn: false }), 'org-1')).toBe(true);
    expect(await theRelease2CollectionsIsOn(org(null), 'org-1')).toBe(true);
    expect(await theRelease2CollectionsIsOn(org({ release2CollectionsOn: true }), null)).toBe(true);
    const broken = { organization: { findUnique: jest.fn(async () => { throw new Error('the database is away'); }) } };
    expect(await theRelease2CollectionsIsOn(broken, 'org-1')).toBe(true);
    expect(await theRelease2CollectionsIsOn({}, 'org-1')).toBe(true);
  });

  it('read from a check-in, it is its organisation\'s switch', async () => {
    const prisma = {
      ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-muchemi' })) },
      organization: { findUnique: jest.fn(async (a: any) => ({ release2CollectionsOn: a.where.id === 'org-muchemi' })) },
    };
    expect(await theRelease2CollectionsIsOnFor(prisma, 'g-collections')).toBe(true);
  });
});

describe('Groundwork staff switch it on, one organisation at a time', () => {
  function service(org: { id: string; name: string } | null) {
    const updates: any[] = [];
    const prisma: any = {
      organization: {
        findUnique: jest.fn(async () => (org ? { id: org.id } : null)),
        update: jest.fn(async (a: any) => { updates.push(a); return { id: org!.id, name: org!.name, release2CollectionsOn: a.data.release2CollectionsOn }; }),
      },
    };
    return { svc: new AdminService(prisma, {} as any, {} as any), updates };
  }

  it('the route sits behind the platform admin guard, on the admin controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminController) ?? [];
    expect(guards).toContain(PlatformAdminGuard);
    expect(typeof (AdminController.prototype as any).setRelease2Collections).toBe('function');
  });

  it('on writes the one column for that organisation alone, and says what changed in a full sentence', async () => {
    const { svc, updates } = service({ id: 'org-muchemi', name: 'Muchemi & Co (test)' });
    const r = await svc.setRelease2Collections('org-muchemi', true);
    expect(updates).toEqual([{ where: { id: 'org-muchemi' }, data: { release2CollectionsOn: true }, select: { id: true, name: true, release2CollectionsOn: true } }]);
    expect(r.says).toBe('Muchemi & Co (test) can now start a check-in to collect what is owed, and its leads confirm each check-in\'s type in People and setup. No existing check-in changes.');
  });

  it('off returns the organisation to what it had, and says nothing is lost', async () => {
    const { svc } = service({ id: 'org-muchemi', name: 'Muchemi & Co (test)' });
    const r = await svc.setRelease2Collections('org-muchemi', false);
    expect(r.release2CollectionsOn).toBe(false);
    expect(r.says).toBe('Muchemi & Co (test) is back to what it had before. No new check-in can be started to collect what is owed, and nothing is lost.');
  });

  it('an organisation that is not there is refused in a full sentence, and nothing is written', async () => {
    const { svc, updates } = service(null);
    await expect(svc.setRelease2Collections('org-gone', true)).rejects.toThrow('That organisation could not be found, so refresh the list and try again.');
    expect(updates).toEqual([]);
  });

  it('anything but true or false is refused, and nothing is written', () => {
    const set = jest.fn();
    const ctl = Object.create(AdminController.prototype);
    ctl.adminService = { setRelease2Collections: set };
    for (const on of [undefined, 'on', 1, null]) {
      expect(() => ctl.setRelease2Collections('org-muchemi', { on })).toThrow('Say whether Release 2 should be on or off for this organisation.');
    }
    expect(set).not.toHaveBeenCalled();
  });
});

describe('the script switches it for a test organisation only', () => {
  it('takes only a name that ends in "(test)"', () => {
    expect(ONLY_A_TEST_ORGANISATION.test('Muchemi & Co (test)')).toBe(true);
    expect(ONLY_A_TEST_ORGANISATION.test('Muchemi & Co (Test) ')).toBe(true);
    expect(ONLY_A_TEST_ORGANISATION.test('Muchemi & Co')).toBe(false);
    expect(ONLY_A_TEST_ORGANISATION.test('Muchemi & Co (test) Advocates')).toBe(false);
  });
});
