import { UsersService } from './users.service';

/**
 * SOMEBODY ADDED TO A CHECK-IN WITH NO SEAT FOR THEM IS STILL A ROW ON "EVERYONE AT <ORGANISATION>"
 * (U.4 people-group review, item 2). Zawadi (on "Sales team, Q3", no account, "not yet written to")
 * was invisible on People even though the prototype (A4 people.txt) lists such people, with the
 * status "No seat on your plan". `findAll` now adds one synthetic row per held email, with nothing
 * on it beyond what the "Somebody is on a check-in with no seat for them" warning already names
 * (their email and the check-in) - no name, no level, no team, and no account to open.
 */
function aService({ members = [] as any[], held = [] as any[] } = {}) {
  const prisma: any = {
    organizationMembership: {
      findMany: jest.fn(async ({ where }: any) => (where.user ? members : [])),
      count: jest.fn(async () => members.length),
    },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => (where.awaitingSeat ? held : [])),
    },
    membershipRequest: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    /* Changed (request 179): only the check-ins the reader may open are named; this reader may open both. */
    ground: { findMany: jest.fn(async () => [{ id: 'ground-sales' }, { id: 'ground-ops' }]) },
  };
  const service = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
  return { service, prisma };
}

const AMANI = {
  role: 'MEMBER',
  heldForASeat: false,
  user: {
    id: 'amani', email: 'amani.u8@example.test', firstName: 'Amani', lastName: 'Wekesa',
    isActive: true, isEmailVerified: true, createdAt: new Date('2026-09-01'), phoneNumber: null, awaitingOrgApproval: false,
  },
};

const ZAWADI_HELD = {
  id: 'gp-zawadi', email: 'zawadi.u8@example.test', createdAt: new Date('2026-09-27'),
  ground: { id: 'ground-sales', label: 'Sales team, Q3' },
};

describe('somebody held for a seat', () => {
  it('is a row, with no seat, no level, no team, and no account to open', async () => {
    const { service } = aService({ members: [AMANI], held: [ZAWADI_HELD] });
    const r: any = await service.findAll("kilima", { page: 1, limit: 20 } as any, 'grace');
    expect(r.data).toHaveLength(2);
    const zawadi = r.data.find((m: any) => m.email === 'zawadi.u8@example.test')!;
    expect(zawadi).toBeTruthy();
    expect(zawadi.heldForASeat).toBe(true);
    expect(zawadi.noAccountYet).toBe(true);
    expect(zawadi.firstName).toBeNull();
    expect(zawadi.level).toBeNull();
    expect(zawadi.team).toBeNull();
    expect(zawadi.checkIns).toEqual([{ id: 'ground-sales', label: 'Sales team, Q3', runsIt: false }]);
    /* Real people are unaffected, and the total grows to match the extra row. */
    expect(r.data.find((m: any) => m.email === 'amani.u8@example.test')).toBeTruthy();
    expect(r.meta.total).toBe(2);
  });

  it('is one row, not one per check-in, when held on more than one', async () => {
    const { service } = aService({
      members: [],
      held: [ZAWADI_HELD, { ...ZAWADI_HELD, id: 'gp-zawadi-2', ground: { id: 'ground-ops', label: 'Asset loans, cohort 3' } }],
    });
    const r: any = await service.findAll("kilima", { page: 1, limit: 20 } as any, 'grace');
    expect(r.data).toHaveLength(1);
    expect(r.data[0].checkIns).toEqual([
      { id: 'ground-sales', label: 'Sales team, Q3', runsIt: false },
      { id: 'ground-ops', label: 'Asset loans, cohort 3', runsIt: false },
    ]);
  });

  it('is left out once an account exists for that address (a real row already says so)', async () => {
    const { service } = aService({
      members: [{ ...AMANI, user: { ...AMANI.user, email: 'zawadi.u8@example.test' } }],
      held: [ZAWADI_HELD],
    });
    const r: any = await service.findAll("kilima", { page: 1, limit: 20 } as any, 'grace');
    expect(r.data).toHaveLength(1);
    expect(r.data[0].noAccountYet).toBeUndefined();
  });

  it('is only read on the first page, so a large roster never shows the same held email twice', async () => {
    const { service, prisma } = aService({ members: [AMANI], held: [ZAWADI_HELD] });
    const r2: any = await service.findAll("kilima", { page: 2, limit: 20 } as any, 'grace');
    expect(r2.data.find((m: any) => m.noAccountYet)).toBeUndefined();
    expect(prisma.groundParticipant.findMany).toHaveBeenCalledTimes(1); // the memberships lookup only; held is skipped on page 2
  });
});
