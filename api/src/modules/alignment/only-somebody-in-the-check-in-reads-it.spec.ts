import { readFileSync } from 'fs';
import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { OnlySomebodyInTheCheckInReadsIt } from './only-somebody-in-the-check-in-reads-it.guard';

/**
 * B-149: the figures, claims, differences, obligations and sides of a check-in answered 200 to a
 * stranger and to an admin of another organisation, where the board and report answered 404.
 */
const GROUND = {
  organizationId: 'org-1',
  initiatorId: 'lead',
  createdByUserId: 'admin-setup',
  scenario: 'TEAM_ALIGNMENT',
  status: 'ACTIVE',
  approvedById: null,
  participants: [{ userId: 'member', email: 'member@x.test' }, { userId: 'lead', email: 'lead@x.test' }],
};
const USERS: Record<string, any> = {
  outsider: { role: 'MEMBER', organizationId: 'org-1', email: 'fatuma@x.test' },
  otherAdmin: { role: 'ADMIN', organizationId: 'org-2', email: 'esther@y.test' },
  member: { role: 'MEMBER', organizationId: 'org-1', email: 'member@x.test' },
  lead: { role: 'LEAD', organizationId: 'org-1', email: 'lead@x.test' },
  admin: { role: 'ADMIN', organizationId: 'org-1', email: 'grace@x.test' },
};
const prisma: any = {
  ground: { findUnique: async ({ where }: any) => (where.id === 'g1' ? GROUND : null) },
  user: { findUnique: async ({ where }: any) => USERS[where.id] ?? null },
};
const ask = (userId: string, groundId = 'g1') =>
  new OnlySomebodyInTheCheckInReadsIt(prisma).canActivate({
    switchToHttp: () => ({ getRequest: () => ({ user: { id: userId }, params: { groundId } }) }),
  } as any);

describe('a read on a check-in asks who is reading first', () => {
  it.each(['outsider', 'otherAdmin'])('refuses %s as the board does, with 404', async (who) => {
    await expect(ask(who)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('refuses a check-in that is not there', async () => {
    await expect(ask('lead', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
  it.each(['member', 'lead', 'admin'])('lets %s read', async (who) => {
    await expect(ask(who)).resolves.toBe(true);
  });

  it('every GET route in the alignment controller carries the guard', () => {
    const src = readFileSync(join(__dirname, 'alignment.controller.ts'), 'utf8');
    const gets = src.match(/@Get\('[^']*'\)/g) ?? [];
    const guarded = src.match(/@UseGuards\(OnlySomebodyInTheCheckInReadsIt\)\s+@Get\(/g) ?? [];
    expect(gets.length).toBeGreaterThanOrEqual(9);
    expect(guarded.length).toBe(gets.length);
  });
});
