import { GroundsService } from './grounds.service';
import { theAddressAndNameIn } from '../../common/an-email-domain';

/**
 * "PIA ALPHA <pia.d2tbx@brightloom.test>" IS AN ADDRESS AND A NAME (journey test, 12 October).
 *
 * Lena pasted her three people the way an address book copies them. The whole line was stored as the
 * address. Pia was then told she was "from outside" her own company, because no domain could be read
 * from it, and when she asked for a sign-in link with her real address no account had that address,
 * so a new organisation, "Pia's workspace", was made for her and her check-in was lost.
 *
 * Fails without the fix in addParticipant: the row was written with the whole line as its address.
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

describe('a pasted "Name <address>" line adds the address, with the name beside it', () => {
  it('stores the plain address and keeps the name the lead pasted', async () => {
    const { service, tx } = makeService({});
    const served: any = await service.addParticipant('g1', 'org1', 'admin', { email: 'pia alpha <Pia.D2tbx@Brightloom.test>' } as any);
    /* And the row the lead is shown names her as typed, never "Somebody invited by email". */
    /* Hafsah, 12 October: a name typed in lower case is capitalised per part. */
    expect(served.nameGiven).toBe('Pia Alpha');
    const data = (tx.groundParticipant.create as jest.Mock).mock.calls[0][0].data;
    expect(data.email).toBe('pia.d2tbx@brightloom.test');
    expect(data.nameGiven).toBe('Pia Alpha');
  });

  it('keeps a name the lead typed separately over the one in the line', async () => {
    const { service, tx } = makeService({});
    await service.addParticipant('g1', 'org1', 'admin', { email: '"Pia A" <pia@brightloom.test>', displayName: 'Pia Alpha' } as any);
    const data = (tx.groundParticipant.create as jest.Mock).mock.calls[0][0].data;
    expect(data.email).toBe('pia@brightloom.test');
    expect(data.nameGiven).toBe('Pia Alpha');
  });

  it('refuses something that is still not an address, in a full sentence', async () => {
    const { service, tx } = makeService({});
    await expect(service.addParticipant('g1', 'org1', 'admin', { email: 'pia alpha' } as any))
      .rejects.toThrow('That does not look like an email address. Check it and try again.');
    expect(tx.groundParticipant.create).not.toHaveBeenCalled();
  });

  it('reads the address out of each shape a mail program writes', () => {
    expect(theAddressAndNameIn('Ben Beta <ben@brightloom.test>')).toEqual({ email: 'ben@brightloom.test', name: 'Ben Beta' });
    expect(theAddressAndNameIn('<cara@brightloom.test>')).toEqual({ email: 'cara@brightloom.test', name: null });
    expect(theAddressAndNameIn('  Cara@Brightloom.test ')).toEqual({ email: 'cara@brightloom.test', name: null });
  });
});
