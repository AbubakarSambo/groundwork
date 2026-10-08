import { ForbiddenException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * DECISION 119, H10: AN ADMIN WHO DOES NOT RUN A CHECK-IN CANNOT CHANGE ITS SET-UP ON THE SERVER,
 * UNLESS THE LEAD HAS LEFT (the screen already said so through `mayChangeSetup`; the server let any
 * admin of the organisation through). Four readers for every writer: the lead, an admin while the
 * lead is there, an admin after the lead has left, and a member.
 */
const LEAD = 'u-lead';
const ADMIN = 'u-admin';
const MEMBER = 'u-member';
const REFUSAL = /Only Wanjiru Mwangi, who runs this check-in, can change how it is set up\. An admin can only do that once Wanjiru has left the organisation\. Nothing was changed\./;

function makeService(leadHasLeft: boolean) {
  const g: any = {
    id: 'g1', organizationId: 'org1', scenario: 'NEW_PROJECT', initiatorId: LEAD, label: 'Old name',
    timelineDays: 90, timelineWeeks: 13, cadence: 'FORTNIGHTLY', mode: 'SHARED', groundAuditLog: null,
  };
  const users: any = {
    [LEAD]: { role: 'MEMBER', organizationId: 'org1', isActive: !leadHasLeft, firstName: 'Wanjiru', lastName: 'Mwangi' },
    [ADMIN]: { role: 'ADMIN', organizationId: 'org1', isActive: true, firstName: 'Otieno', lastName: 'Kamau' },
    [MEMBER]: { role: 'MEMBER', organizationId: 'org1', isActive: true, firstName: 'Aisha', lastName: 'Bello' },
  };
  const update = jest.fn(async (args: any) => ({ ...g, ...args.data }));
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => g), update },
    groundParticipant: { findFirst: jest.fn(async (a: any) => (a?.where?.userId === MEMBER ? { id: 'p1' } : null)) },
    user: { findUnique: jest.fn(async (a: any) => users[a.where.id] ?? null) },
    checkIn: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), updateMany: jest.fn(async () => ({ count: 0 })) },
  };
  const service: any = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, update };
}

const writers: Array<[string, (s: any, who: string) => Promise<any>]> = [
  ['who sees targets', (s, who) => s.setWhoSeesTargets('g1', who, true)],
  ['expecting them to unblock', (s, who) => s.setExpectThemToUnblock('g1', who, false)],
  ['simpler words', (s, who) => s.setSimplerWords('g1', who, true)],
  ['who sees whom', (s, who) => s.setPeerVisibility('g1', who, true)],
  ['people working together', (s, who) => s.setPeopleWorkTogether('g1', who, true)],
  ['the name', (s, who) => s.updateTimeline('g1', who, { label: 'New name' })],
  ['the rhythm', (s, who) => s.updateTimeline('g1', who, { cadence: 'WEEKLY' })],
  ['the timeline', (s, who) => s.updateTimeline('g1', who, { timelineWeeks: 8 })],
  ['the start date', (s, who) => s.updateTimeline('g1', who, { startsAt: '2026-11-01' })],
  ['the day check-ins land on (request 194)', (s, who) => s.updateTimeline('g1', who, { cadenceAnchorDay: 1 })],
];

describe.each(writers)('H10: changing %s', (_name, write) => {
  it('the lead may', async () => {
    const { service, update } = makeService(false);
    await write(service, LEAD);
    expect(update).toHaveBeenCalled();
  });
  it('an admin may not while the lead is there, and is told in one plain sentence', async () => {
    const { service, update } = makeService(false);
    await expect(write(service, ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(write(service, ADMIN)).rejects.toThrow(REFUSAL);
    expect(update).not.toHaveBeenCalled();
  });
  it('an admin may once the lead has left', async () => {
    const { service, update } = makeService(true);
    await write(service, ADMIN);
    expect(update).toHaveBeenCalled();
  });
  it('a member may not, whether or not the lead has left', async () => {
    for (const left of [false, true]) {
      const { service, update } = makeService(left);
      await expect(write(service, MEMBER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(update).not.toHaveBeenCalled();
    }
  });
});
