import { BadRequestException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * REQUEST 194: THE DAY THE CHECK-INS LAND ON CAN BE CHANGED AFTER SETUP (live let a lead choose it at setup; changing it later is on
 * PATCH /grounds/:id with `cadenceAnchorDay`). A weekday (0 Sunday to 6 Saturday) for weekly and fortnightly, a day of the month
 * (1 to 31) for monthly, null to clear it. Read as the lead, who is the only one who may (an admin only once the lead has left, decision 119).
 */
function world(ground: Record<string, unknown> = {}) {
  const g: any = { id: 'g1', organizationId: 'org1', scenario: 'NEW_PROJECT', initiatorId: 'u-lead', label: 'Sales team, Q4', timelineDays: 90, timelineWeeks: 13, cadence: 'WEEKLY', cadenceAnchorDay: null, mode: 'SHARED', groundAuditLog: null, ...ground };
  const update = jest.fn(async (args: any) => ({ ...g, ...args.data }));
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => g), update },
    groundParticipant: { findFirst: jest.fn(async () => null) },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1', isActive: true, firstName: 'Wairimu', lastName: 'Njoroge' })) },
    checkIn: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), updateMany: jest.fn(async () => ({ count: 0 })) },
  };
  const service: any = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, update };
}
const saved = (u: jest.Mock) => u.mock.calls[0][0].data;

describe('the lead changes the day', () => {
  it('a weekly check-in lands on Monday', async () => {
    const { service, update } = world();
    await service.updateTimeline('g1', 'u-lead', { cadenceAnchorDay: 1 });
    expect(saved(update).cadenceAnchorDay).toBe(1);
    expect(saved(update).groundAuditLog.timeline[0].changes.cadenceAnchorDay).toEqual({ from: null, to: 1 });
  });
  it('a monthly one lands on the 15th, and the 31st is allowed', async () => {
    const { service, update } = world({ cadence: 'MONTHLY' });
    await service.updateTimeline('g1', 'u-lead', { cadenceAnchorDay: 15 });
    expect(saved(update).cadenceAnchorDay).toBe(15);
    await service.updateTimeline('g1', 'u-lead', { cadenceAnchorDay: 31 });
    expect(update.mock.calls[1][0].data.cadenceAnchorDay).toBe(31);
  });
  it('null clears it, so the check-in lands wherever the rhythm puts it', async () => {
    const { service, update } = world({ cadenceAnchorDay: 3 });
    await service.updateTimeline('g1', 'u-lead', { cadenceAnchorDay: null });
    expect(saved(update).cadenceAnchorDay).toBeNull();
  });
  it('sending the rhythm and the day together judges the day by the new rhythm', async () => {
    const { service, update } = world({ cadence: 'WEEKLY' });
    await service.updateTimeline('g1', 'u-lead', { cadence: 'MONTHLY', cadenceAnchorDay: 20 });
    expect(saved(update)).toMatchObject({ cadence: 'MONTHLY', cadenceAnchorDay: 20 });
  });
  it('changing a weekly rhythm to a monthly one with no new day clears the old weekday, which would be read as the 1st', async () => {
    const { service, update } = world({ cadence: 'WEEKLY', cadenceAnchorDay: 1 });
    await service.updateTimeline('g1', 'u-lead', { cadence: 'MONTHLY' });
    expect(saved(update).cadenceAnchorDay).toBeNull();
  });
  it('changing weekly to fortnightly keeps the weekday', async () => {
    const { service, update } = world({ cadence: 'WEEKLY', cadenceAnchorDay: 1 });
    await service.updateTimeline('g1', 'u-lead', { cadence: 'FORTNIGHTLY' });
    expect('cadenceAnchorDay' in saved(update)).toBe(false);
  });
});

describe('what is refused is refused in a sentence, and nothing is written', () => {
  const refused = async (ground: Record<string, unknown>, dto: Record<string, unknown>) => {
    const { service, update } = world(ground);
    const err: any = await service.updateTimeline('g1', 'u-lead', dto).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
    return err.message as string;
  };
  it('a day of the month on a weekly check-in', async () => {
    expect(await refused({ cadence: 'WEEKLY' }, { cadenceAnchorDay: 15 })).toBe('Choose a day of the week for the check-ins to land on, from Sunday to Saturday.');
  });
  it('a weekday number on a monthly check-in, and the 0th', async () => {
    expect(await refused({ cadence: 'MONTHLY' }, { cadenceAnchorDay: 0 })).toBe('Choose a day of the month for the check-ins to land on, from the 1st to the 31st.');
  });
  it('any day on a daily, one-time or as-you-decide check-in', async () => {
    for (const cadence of ['DAILY', 'ONE_TIME', 'SEQUENTIAL']) {
      expect(await refused({ cadence }, { cadenceAnchorDay: 2 })).toBe('A check-in that happens every day, once, or when you decide has no day to land on, so choose a weekly, fortnightly or monthly rhythm first.');
    }
  });
});

describe('who may', () => {
  it('a member of the check-in is refused', async () => {
    const { service, update } = world();
    (service as any).prisma.groundParticipant.findFirst = jest.fn(async () => ({ id: 'p1' }));
    await expect(service.updateTimeline('g1', 'u-member', { cadenceAnchorDay: 2 })).rejects.toThrow(/Only .* who runs this check-in, can change how it is set up/);
    expect(update).not.toHaveBeenCalled();
  });
});
