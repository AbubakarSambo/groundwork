import { GroundsService } from './grounds.service';

/**
 * THE TEAM'S FIRST SESSION OPENS AT THE START THE LEAD CHOSE (item 5, Hafsah, 11 October 2026).
 *
 * At the end of setup the lead picks "When it starts": Now, Tomorrow, or On a date. The entry flow
 * adds each person with that start (`addParticipant`, startsAt = checkInBy). The start only held
 * the invitation back; the session itself had no gate, so somebody with the link could answer
 * session 1 before the check-in had started. Now session 1 opens on the chosen day. "Now", and a
 * start already passed, leave it open at once, as before.
 */
function world(ground: Record<string, unknown> = {}) {
  const g: any = { id: 'g1', organizationId: 'org1', initiatorId: 'lead', label: 'Kilimani estates', isFreeGround: false, freeParticipantCap: 10, cadence: 'WEEKLY', status: 'ACTIVE', scenario: 'NEW_PROJECT', startsAt: null, ...ground };
  const participants: any[] = [];
  const tx: any = {
    groundParticipant: { create: jest.fn(async (args: any) => { const row = { id: `p-${participants.length + 1}`, createdAt: new Date(), userId: null, notifiedAt: null, leftAt: null, ...args.data }; participants.push(row); return row; }) },
    checkIn: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    ground: {
      findFirst: jest.fn(async (args: any) => (args?.where?.status === 'AWAITING_APPROVAL' ? null : g)),
      update: jest.fn(async () => g),
    },
    groundDocument: { count: jest.fn(async () => 1) },
    leadContextNote: { count: jest.fn(async () => 0) },
    personObjective: { count: jest.fn(async () => 0) },
    groundContextItem: { count: jest.fn(async () => 0) },
    user: { findUnique: jest.fn(async () => ({ id: 'lead', firstName: 'Nandi', email: 'nandi@x.test' })), count: jest.fn(async () => 0) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null })) },
    groundParticipant: {
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => participants.length),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ where, data }: any) => Object.assign(participants.find((p) => p.id === where.id) ?? {}, data)),
      updateMany: jest.fn(async () => ({ count: 1 })),
      delete: jest.fn(async () => ({})),
    },
    checkIn: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 1) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    organizationMembership: { findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null) },
  };
  const email: any = { sendTheInviteThisGroundSends: jest.fn(async () => ({})), sendParticipantInvite: jest.fn(async () => ({})) };
  const service: any = new GroundsService(prisma, email, { seatsIncludedFor: async () => null } as any, { emit: () => undefined } as any, { emit: async () => undefined } as any, { get: () => 'http://localhost:5173' } as any, { respond: async () => '' } as any);
  service.refuseAnEvaluationTheAdminWasNotGivenAccessTo = async () => undefined;
  const session1 = () => tx.checkIn.create.mock.calls.map((c: any) => c[0].data).find((d: any) => d.sessionNumber === 1);
  return { service, session1, email };
}

const day = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

describe("the team's first session follows the lead's start", () => {
  it('Now: session 1 is open at once and the invitation goes now', async () => {
    const { service, session1, email } = world();
    await service.addParticipant('g1', 'org1', 'lead', { email: 'amina@x.test', displayName: 'Amina Bello' } as any);
    expect(session1().availableFrom).toBeNull();
    expect(email.sendTheInviteThisGroundSends).toHaveBeenCalledTimes(1);
  });

  it('Tomorrow: session 1 opens tomorrow, and the invitation waits for it', async () => {
    const { service, session1, email } = world({ startsAt: new Date(`${day(1)}T00:00:00Z`) });
    await service.addParticipant('g1', 'org1', 'lead', { email: 'amina@x.test', displayName: 'Amina Bello', startsAt: day(1) } as any);
    expect(session1().availableFrom).toEqual(new Date(`${day(1)}T00:00:00Z`));
    expect(email.sendTheInviteThisGroundSends).not.toHaveBeenCalled();
  });

  it('On a date: session 1 opens on that date', async () => {
    const { service, session1 } = world({ startsAt: new Date(`${day(10)}T00:00:00Z`) });
    await service.addParticipant('g1', 'org1', 'lead', { email: 'amina@x.test', startsAt: day(10) } as any);
    expect(session1().availableFrom).toEqual(new Date(`${day(10)}T00:00:00Z`));
  });

  it("somebody added later without a start of their own still waits for the check-in's start", async () => {
    const { service, session1 } = world({ startsAt: new Date(`${day(10)}T00:00:00Z`) });
    await service.addParticipant('g1', 'org1', 'lead', { email: 'amina@x.test' } as any);
    expect(session1().availableFrom).toEqual(new Date(`${day(10)}T00:00:00Z`));
  });

  it('a check-in that has already started opens session 1 at once, as it always did', async () => {
    const { service, session1 } = world({ startsAt: new Date(`${day(-14)}T00:00:00Z`) });
    await service.addParticipant('g1', 'org1', 'lead', { email: 'amina@x.test' } as any);
    expect(session1().availableFrom).toBeNull();
  });
});
