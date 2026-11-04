import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PromptsController } from '../prompts/prompts.controller';
import { THE_ORGANISATION_SWITCHES } from './the-organisation-switches';

/**
 * THE SWITCHBOARD IS FOR GROUNDWORK'S OPS TEAM ONLY (Hafsah, 25 October 2026, night). The release switches, the direct morning, the
 * lead's read of each person, the platform settings and the prompts are read and changed only by Groundwork staff (isPlatformAdmin),
 * refused on the server to a client admin, a lead and a team member.
 */
const asIf = (user: any) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as any;
const CLIENT_ADMIN = { id: 'u-grace', role: 'ADMIN', organizationId: 'org-drop', isPlatformAdmin: false };
const LEAD = { id: 'u-wanjiru', role: 'LEAD', organizationId: 'org-mu', isPlatformAdmin: false };
const MEMBER = { id: 'u-kevin', role: 'MEMBER', organizationId: 'org-drop' };
const OPS = { id: 'u-ops', role: 'ADMIN', organizationId: 'org-groundwork', isPlatformAdmin: true };

describe('the switches are Groundwork\'s own', () => {
  it('every admin route (the switches, platform settings, pricing) and every prompt route sits behind the staff guard', () => {
    for (const c of [AdminController, PromptsController]) {
      expect(Reflect.getMetadata(GUARDS_METADATA, c)).toContain(PlatformAdminGuard);
    }
    expect(Reflect.getMetadata(PATH_METADATA, AdminController)).toBe('admin');
    for (const m of ['theSwitchesOf', 'setASwitch', 'setReleaseOneSalesBoard', 'setRelease2Collections']) {
      expect(typeof (AdminController.prototype as any)[m]).toBe('function');
    }
  });

  it('a client admin, a lead and a team member are refused on the server', () => {
    const guard = new PlatformAdminGuard();
    for (const who of [CLIENT_ADMIN, LEAD, MEMBER, undefined]) {
      expect(() => guard.canActivate(asIf(who))).toThrow(new ForbiddenException('This part is for Groundwork staff.'));
    }
  });

  it('the ops team passes', () => {
    expect(new PlatformAdminGuard().canActivate(asIf(OPS))).toBe(true);
  });

  it('the ops team reads every switch of an organisation and sets one, and nothing outside the list can be written', async () => {
    const org: any = { id: 'org-drop', name: 'Drop Access (test)', release3InvoicesOn: false, directMorningOn: true, billWord: 'invoice' };
    const update = jest.fn(async ({ data }: any) => Object.assign(org, data));
    const svc = new AdminService({ organization: { findUnique: jest.fn(async () => org), update } } as any, {} as any, {} as any);
    const read = await svc.theSwitchesOf('org-drop');
    expect(read.switches.map((s) => s.key)).toEqual(THE_ORGANISATION_SWITCHES.map((s) => s.key));
    expect(read.switches.find((s) => s.key === 'directMorningOn')!.on).toBe(true);
    await svc.setASwitch('org-drop', 'release3InvoicesOn', true);
    expect(update).toHaveBeenCalledWith({ where: { id: 'org-drop' }, data: { release3InvoicesOn: true } });
    await expect(svc.setASwitch('org-drop', 'billWord', true)).rejects.toThrow(BadRequestException);
    await expect(svc.setASwitch('org-drop', 'isPlatformAdmin', true)).rejects.toThrow(BadRequestException);
  });
});
