import { UsersService } from './users.service';

/**
 * "ALREADY HERE" MEANS IN THIS ORGANISATION (U.4 fourth review). Pasting admin-u4@example.test, an
 * account at another organisation and not at this one, read "1 person is already here." and was never
 * invited. The check now asks for an active membership here that is not held for a seat.
 */
const accounts: any = {
  'miriam@baridi.co.ke': { memberships: [{ organizationId: 'baridi', heldForASeat: false }], isActive: true },
  'admin-u4@example.test': { memberships: [{ organizationId: 'elsewhere', heldForASeat: false }], isActive: true },
  'pendo@baridi.co.ke': { memberships: [{ organizationId: 'baridi', heldForASeat: false }], isActive: false },
};
function aService() {
  const prisma: any = {
    organizationMembership: {
      findMany: jest.fn(async ({ where }: any) => Object.entries(accounts)
        .filter(([email, a]: any) => where.user.email.in.includes(email) 
          && a.memberships.some((m: any) => m.organizationId === where.organizationId && m.heldForASeat === where.heldForASeat))
        .map(([email]) => ({ user: { email } }))),
    },
  };
  const billing: any = { seatsLeft: jest.fn(async () => 10) };
  return new UsersService(prisma, {} as any, billing, {} as any, { emit: () => undefined } as any);
}

describe('checking a pasted list at Baridi', () => {
  it('somebody with an account elsewhere will be invited, and nothing is said about that account', async () => {
    const a = await aService().inviteMany('baridi', 'Baridi Appliances', 'admin-u4@example.test', true);
    expect(a.rows).toEqual([{ email: 'admin-u4@example.test', result: 'invited' }]);
    expect(a.summary).toBe('1 person will be invited.');
  });

  it('somebody in this organisation is already here, as before', async () => {
    const a = await aService().inviteMany('baridi', 'Baridi Appliances', 'miriam@baridi.co.ke', true);
    expect(a.rows).toEqual([{ email: 'miriam@baridi.co.ke', result: 'already here' }]);
    expect(a.summary).toBe('1 person is already here.');
  });

});
