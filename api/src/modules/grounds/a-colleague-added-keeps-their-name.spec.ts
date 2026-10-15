import { GroundsService } from './grounds.service';

/**
 * A COLLEAGUE PICKED FROM THE LIST IS NOT A COLD, TYPED-EMAIL INVITE (U.8 re-review).
 *
 * Rukia added Amani to a check-in by picking her from the colleague list, not by typing her
 * address. `addParticipant` looked her account up to find her address, used it, and threw the rest
 * of what it had just learned away - so the participant row was created exactly as bare as a
 * stranger's typed email would be. Every reader that shows this person before she has accepted
 * (the lead's Done page, the check-in's own roster) then had nothing to go on but her address, and
 * fell back to guessing a name from it: "Amani U8" for an account actually named "Amani Wekesa".
 *
 * `nameGiven` is the field every one of those readers already prefers to a guessed name the moment
 * `user.firstName` itself is not yet available (client's `theirName`, and the engine's own
 * `party-labels.ts`). Writing the colleague's real name there at add-time fixes all of them at
 * once, without changing when somebody is treated as having actually joined - `userId` stays null
 * until they accept, exactly as before, so "has not joined yet" keeps meaning what it always meant.
 */
function makeService(membershipsById: Record<string, { email: string; firstName: string | null; lastName: string | null }>) {
  const tx: any = {
    groundParticipant: { create: jest.fn(async (args: any) => ({ id: 'new-p', ...args.data })) },
    checkIn: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    ground: {
      findFirst: jest.fn(async (args: any) =>
        args?.where?.status === 'AWAITING_APPROVAL' ? null : { id: 'g1', initiatorId: 'admin', label: 'Test', isFreeGround: false, cadence: 'FORTNIGHTLY' },
      ),
    },
    groundDocument: { count: jest.fn(async () => 0) },
    leadContextNote: { count: jest.fn(async () => 0) },
    user: { findUnique: jest.fn(async () => ({ id: 'admin', firstName: 'Admin' })), count: jest.fn(async () => 0) },
    organization: { findUnique: jest.fn(async () => ({ subscriptionPlan: null, subscriptionStatus: null })) },
    organizationMembership: {
      findFirst: jest.fn(async ({ where }: any) => {
        const found = membershipsById[where.userId];
        if (!found || where.organizationId !== 'org1') return null;
        return { user: { email: found.email, firstName: found.firstName, lastName: found.lastName } };
      }),
    },
    groundParticipant: {
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      update: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
    },
    checkIn: { findFirst: jest.fn(async () => null), count: jest.fn(async () => 1) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const email: any = { sendParticipantInvite: jest.fn(async () => ({})) };
  const usage: any = { emit: () => Promise.resolve() };
  const service = new GroundsService(
    prisma, email,
    { seatsIncludedFor: async () => null } as any,
    { emit: () => Promise.resolve() } as any,
    usage, {} as any,
    { respond: async () => '' } as any,
  );
  return { service, tx };
}

describe('adding a colleague picked from the list keeps her real name', () => {
  it('writes her account name as nameGiven, not just her address', async () => {
    const { service, tx } = makeService({ amani: { email: 'amani.u8@example.test', firstName: 'Amani', lastName: 'Wekesa' } });
    await service.addParticipant('g1', 'org1', 'admin', { colleagueId: 'amani' } as any);
    expect(tx.groundParticipant.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'amani.u8@example.test', nameGiven: 'Amani Wekesa' }) }),
    );
  });

  it('leaves nameGiven out for a typed address, which carries no name to know', async () => {
    const { service, tx } = makeService({});
    await service.addParticipant('g1', 'org1', 'admin', { email: 'new@test.com' } as any);
    const data = (tx.groundParticipant.create as jest.Mock).mock.calls[0][0].data;
    expect(data).not.toHaveProperty('nameGiven');
  });

  it('still refuses a colleague id that is not in this organisation', async () => {
    const { service } = makeService({ amani: { email: 'amani@elsewhere.test', firstName: 'Amani', lastName: 'Wekesa' } });
    await expect(
      service.addParticipant('g1', 'org-other', 'admin', { colleagueId: 'amani' } as any),
    ).rejects.toThrow(/not in this organisation/);
  });
});
