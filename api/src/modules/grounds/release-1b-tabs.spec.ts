import { readFileSync } from 'fs';
import { join } from 'path';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { theRelease1bTabsAreOn } from './release-1b-tabs';
import { AdminController } from '../admin/admin.controller';
import { AdminService } from '../admin/admin.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ONLY_A_TEST_ORGANISATION } from '../../../scripts/the-release-1b-tabs';

/**
 * RELEASE 1B'S NEW CHECK-IN TABS, A SWITCH PER ORGANISATION (Hafsah, 18 October 2026; release plan, Part 0). Off for every
 * organisation already here and every new one, off when its row cannot be read, switched on by Groundwork staff alone, and
 * by script only for a "(test)" organisation.
 */
const API = join(__dirname, '..', '..', '..');

describe('the switch is off for every organisation until it is switched on', () => {
  it('the migration only adds the column, false for every organisation already here, and can be run again', () => {
    const sql = readFileSync(join(API, 'prisma/migrations/20261019120000_release_1b_tabs_switch/migration.sql'), 'utf8');
    const statements = sql.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));
    expect(statements).toEqual(['ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_1b_tabs_on" BOOLEAN NOT NULL DEFAULT false;']);
    const schema = readFileSync(join(API, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('release1bTabsOn        Boolean   @default(false) @map("release_1b_tabs_on")');
  });

  it('reads on only when the organisation\'s row says true', async () => {
    const org = (row: any) => ({ organization: { findUnique: jest.fn(async () => row) } });
    expect(await theRelease1bTabsAreOn(org({ release1bTabsOn: true }), 'org-1')).toBe(true);
    expect(await theRelease1bTabsAreOn(org({ release1bTabsOn: false }), 'org-1')).toBe(false);
    expect(await theRelease1bTabsAreOn(org(null), 'org-1')).toBe(false);
    expect(await theRelease1bTabsAreOn(org({ release1bTabsOn: 'yes' }), 'org-1')).toBe(false);
    expect(await theRelease1bTabsAreOn(org({ release1bTabsOn: true }), null)).toBe(false);
  });

  it('reads as off when the row cannot be read, so it fails closed to the tabs people had', async () => {
    const broken = { organization: { findUnique: jest.fn(async () => { throw new Error('the database is away'); }) } };
    expect(await theRelease1bTabsAreOn(broken, 'org-1')).toBe(false);
    expect(await theRelease1bTabsAreOn({}, 'org-1')).toBe(false);
  });
});

describe('Groundwork staff switch it on, one organisation at a time', () => {
  function service(org: { id: string; name: string } | null) {
    const updates: any[] = [];
    const prisma: any = {
      organization: {
        findUnique: jest.fn(async () => (org ? { id: org.id } : null)),
        update: jest.fn(async (a: any) => { updates.push(a); return { id: org!.id, name: org!.name, release1bTabsOn: a.data.release1bTabsOn }; }),
      },
    };
    return { svc: new AdminService(prisma, {} as any, {} as any), updates };
  }

  it('the route sits behind the platform admin guard, on the admin controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminController) ?? [];
    expect(guards).toContain(PlatformAdminGuard);
    expect(typeof (AdminController.prototype as any).setRelease1bTabs).toBe('function');
  });

  it('on writes the one column for that organisation alone, and says what changed in a full sentence', async () => {
    const { svc, updates } = service({ id: 'org-drop', name: 'Drop Access (test)' });
    const r = await svc.setRelease1bTabs('org-drop', true);
    expect(updates).toEqual([{ where: { id: 'org-drop' }, data: { release1bTabsOn: true }, select: { id: true, name: true, release1bTabsOn: true } }]);
    expect(r.says).toBe('Drop Access (test) now has the new People and setup tab. Each check-in shows it the next time it is opened, and no setting changes.');
  });

  it('off returns the organisation to the tab it had, and says nothing is lost', async () => {
    const { svc } = service({ id: 'org-drop', name: 'Drop Access (test)' });
    const r = await svc.setRelease1bTabs('org-drop', false);
    expect(r.release1bTabsOn).toBe(false);
    expect(r.says).toBe('Drop Access (test) is back on the People and setup tab it had before. No setting has changed and nothing is lost.');
  });

  it('an organisation that is not there is refused in a full sentence, and nothing is written', async () => {
    const { svc, updates } = service(null);
    await expect(svc.setRelease1bTabs('org-gone', true)).rejects.toThrow('That organisation could not be found, so refresh the list and try again.');
    expect(updates).toEqual([]);
  });

  it('anything but true or false is refused, and nothing is written', () => {
    const set = jest.fn();
    const ctl = Object.create(AdminController.prototype);
    ctl.adminService = { setRelease1bTabs: set };
    for (const on of [undefined, 'on', 1, null]) {
      expect(() => ctl.setRelease1bTabs('org-drop', { on })).toThrow('Say whether the new check-in tabs should be on or off for this organisation.');
    }
    expect(set).not.toHaveBeenCalled();
  });
});

describe('the script switches it for a test organisation only', () => {
  it('takes only a name that ends in "(test)"', () => {
    expect(ONLY_A_TEST_ORGANISATION.test('Drop Access (test)')).toBe(true);
    expect(ONLY_A_TEST_ORGANISATION.test('Drop Access (Test) ')).toBe(true);
    expect(ONLY_A_TEST_ORGANISATION.test('Drop Access')).toBe(false);
    expect(ONLY_A_TEST_ORGANISATION.test('Drop Access (test) Ltd')).toBe(false);
  });
});
