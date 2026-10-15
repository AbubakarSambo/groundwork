import { openTheLeadsCheckIn, ONLY_THE_LEAD_CHECKS_IN_HERE, THIS_CHECK_IN_HAS_ENDED } from './check-in-yourself';

/** Decision 133: "Check in yourself" opens the lead's own check-in on demand, any time it is running. */
function prismaFor(over: { status?: string; initiatorId?: string; open?: any; teamMax?: number; mineMax?: number; managingOnly?: boolean } = {}) {
  const create = jest.fn(async ({ data }: any) => ({ id: 'ci-new', sessionNumber: data.sessionNumber }));
  return {
    create,
    prisma: {
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', status: over.status ?? 'ACTIVE', initiatorId: over.initiatorId ?? 'u-wairimu', organizationId: 'org1' })) },
      groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p-wairimu', managingOnly: !!over.managingOnly })) },
      checkIn: {
        findFirst: jest.fn(async () => over.open ?? null),
        aggregate: jest.fn(async ({ where }: any) => ({ _max: { sessionNumber: where.groundId ? (over.teamMax ?? 3) : (over.mineMax ?? 1) } })),
        create,
      },
    },
  };
}

describe('Check in yourself', () => {
  it('opens a new optional check-in for the lead on the round the team is on', async () => {
    const { prisma, create } = prismaFor({ teamMax: 3, mineMax: 1 });
    const r = await openTheLeadsCheckIn(prisma, 'g1', 'org1', 'u-wairimu');
    expect(r).toEqual({ checkInId: 'ci-new', sessionNumber: 3, opened: true });
    expect(create.mock.calls[0][0].data).toMatchObject({ participantId: 'p-wairimu', sessionNumber: 3, status: 'NOT_STARTED', optional: true });
  });

  it('uses an open one again rather than making a second', async () => {
    const { prisma, create } = prismaFor({ open: { id: 'ci-open', sessionNumber: 2 } });
    expect(await openTheLeadsCheckIn(prisma, 'g1', 'org1', 'u-wairimu')).toEqual({ checkInId: 'ci-open', sessionNumber: 2, opened: false });
    expect(create).not.toHaveBeenCalled();
  });

  it('gives the next number when the lead already checked in this round', async () => {
    const { prisma } = prismaFor({ teamMax: 3, mineMax: 3 });
    expect((await openTheLeadsCheckIn(prisma, 'g1', 'org1', 'u-wairimu')).sessionNumber).toBe(4);
  });

  it('works the same for a lead who chose "only the team" before', async () => {
    const { prisma } = prismaFor({ managingOnly: true });
    expect((await openTheLeadsCheckIn(prisma, 'g1', 'org1', 'u-wairimu')).opened).toBe(true);
  });

  it('is refused to anybody who does not run it, and on a check-in that has ended, in a plain sentence', async () => {
    await expect(openTheLeadsCheckIn(prismaFor().prisma, 'g1', 'org1', 'u-brian')).rejects.toThrow(ONLY_THE_LEAD_CHECKS_IN_HERE);
    await expect(openTheLeadsCheckIn(prismaFor({ status: 'CLOSED' }).prisma, 'g1', 'org1', 'u-wairimu')).rejects.toThrow(THIS_CHECK_IN_HAS_ENDED);
  });
});
