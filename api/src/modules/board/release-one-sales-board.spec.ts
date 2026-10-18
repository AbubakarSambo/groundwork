import { readFileSync } from 'fs';
import { join } from 'path';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { theReleaseOneSalesBoardIsOn, theReleaseOneSalesBoardIsOnFor } from './release-one-sales-board';
import { AdminController } from '../admin/admin.controller';
import { AdminService } from '../admin/admin.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { ONLY_A_TEST_ORGANISATION } from '../../../scripts/the-release-one-sales-board';

/**
 * RELEASE 1'S SALES BOARD, A SWITCH PER ORGANISATION (release plan, Part 0: "Each release's new boards sit behind a switch per
 * organisation ... switching it off returns them to their previous board with nothing lost").
 *
 * In this part the switch only exists: it is off for every organisation already here and every new one, it reads as off
 * when its row cannot be read, Groundwork staff alone can turn it on, and the script only touches a test organisation.
 */
const API = join(__dirname, '..', '..', '..');

describe('the switch is off for every organisation until it is switched on', () => {
  it('the migration only adds the column, false for every organisation already here, and can be run again', () => {
    const sql = readFileSync(join(API, 'prisma/migrations/20261017120000_release_one_sales_board_switch/migration.sql'), 'utf8');
    const statements = sql.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));
    expect(statements).toEqual(['ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_1_sales_board_on" BOOLEAN NOT NULL DEFAULT false;']);
    const schema = readFileSync(join(API, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('release1SalesBoardOn   Boolean   @default(false) @map("release_1_sales_board_on")');
  });

  it('reads on only when the organisation\'s row says true', async () => {
    const org = (row: any) => ({ organization: { findUnique: jest.fn(async () => row) } });
    expect(await theReleaseOneSalesBoardIsOn(org({ release1SalesBoardOn: true }), 'org-1')).toBe(true);
    expect(await theReleaseOneSalesBoardIsOn(org({ release1SalesBoardOn: false }), 'org-1')).toBe(false);
    expect(await theReleaseOneSalesBoardIsOn(org(null), 'org-1')).toBe(false);
    expect(await theReleaseOneSalesBoardIsOn(org({ release1SalesBoardOn: 'yes' }), 'org-1')).toBe(false);
    expect(await theReleaseOneSalesBoardIsOn(org({ release1SalesBoardOn: true }), null)).toBe(false);
  });

  it('reads as off when the row cannot be read, so it fails closed to the board people had', async () => {
    const broken = { organization: { findUnique: jest.fn(async () => { throw new Error('the database is away'); }) } };
    expect(await theReleaseOneSalesBoardIsOn(broken, 'org-1')).toBe(false);
    expect(await theReleaseOneSalesBoardIsOn({}, 'org-1')).toBe(false);
    const noGround = { ground: { findUnique: jest.fn(async () => { throw new Error('away'); }) } };
    expect(await theReleaseOneSalesBoardIsOnFor(noGround, 'g-1')).toBe(false);
    const on = { ground: { findUnique: jest.fn(async () => ({ organizationId: 'org-1' })) }, organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) } };
    expect(await theReleaseOneSalesBoardIsOnFor(on, 'g-1')).toBe(true);
  });
});

describe('Groundwork staff switch it on, one organisation at a time', () => {
  function service(org: { id: string; name: string } | null) {
    const updates: any[] = [];
    const prisma: any = {
      organization: {
        findUnique: jest.fn(async () => (org ? { id: org.id } : null)),
        update: jest.fn(async (a: any) => { updates.push(a); return { id: org!.id, name: org!.name, release1SalesBoardOn: a.data.release1SalesBoardOn }; }),
      },
    };
    return { svc: new AdminService(prisma, {} as any, {} as any), updates };
  }

  it('the route sits behind the platform admin guard, on the admin controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminController) ?? [];
    expect(guards).toContain(PlatformAdminGuard);
    expect(typeof (AdminController.prototype as any).setReleaseOneSalesBoard).toBe('function');
  });

  it('on writes the one column for that organisation alone, and says what changed in a full sentence', async () => {
    const { svc, updates } = service({ id: 'org-drop', name: 'Drop Access (test)' });
    const r = await svc.setReleaseOneSalesBoard('org-drop', true);
    expect(updates).toEqual([{ where: { id: 'org-drop' }, data: { release1SalesBoardOn: true }, select: { id: true, name: true, release1SalesBoardOn: true } }]);
    expect(r.says).toBe('Drop Access (test) has the new sales board switched on. Its board and reports show it once the rest of Release 1 is in, from the next time they are opened.');
  });

  it('off returns the organisation to its previous board, and says nothing is lost', async () => {
    const { svc } = service({ id: 'org-drop', name: 'Drop Access (test)' });
    const r = await svc.setReleaseOneSalesBoard('org-drop', false);
    expect(r.release1SalesBoardOn).toBe(false);
    expect(r.says).toBe('Drop Access (test) is back on its previous board. Nothing it has said or added is lost.');
  });

  it('an organisation that is not there is refused in a full sentence, and nothing is written', async () => {
    const { svc, updates } = service(null);
    await expect(svc.setReleaseOneSalesBoard('org-gone', true)).rejects.toThrow('That organisation could not be found, so refresh the list and try again.');
    expect(updates).toEqual([]);
  });

  it('anything but true or false is refused, and nothing is written', () => {
    const set = jest.fn();
    const ctl = Object.create(AdminController.prototype);
    ctl.adminService = { setReleaseOneSalesBoard: set };
    for (const on of [undefined, 'on', 1, null]) {
      expect(() => ctl.setReleaseOneSalesBoard('org-drop', { on })).toThrow('Say whether the new sales board should be on or off for this organisation.');
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
