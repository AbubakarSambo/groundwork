import { UsersService } from './users.service';

/**
 * THE PEOPLE LIST NAMES ONLY THE CHECK-INS THE ADMIN MAY OPEN (request 179, 7 October 2026).
 *
 * Arjun is on "Sales team, Q4", which Grace may open, and on "Arjun Shah, first ninety days", a performance plan she was never given access to.
 * Read as Grace, the first is named and the second is a count, so the screen can say "1 check-in you have no access to". Read as an admin who
 * was given access to the plan, both are named. With no reader, nothing is named.
 */
function theList(mayOpen: string[]) {
  const prisma: any = {
    organizationMembership: {
      findMany: jest.fn(async ({ where }: any) => (where.user ? [{ role: 'MEMBER', user: { id: 'arjun', email: 'arjun@kijani.test', firstName: 'Arjun', lastName: 'Shah', isActive: true, isEmailVerified: true, createdAt: new Date('2026-09-01'), phoneNumber: null, awaitingOrgApproval: false } }] : [])),
      count: jest.fn(async () => 1),
    },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => (where.awaitingSeat ? [] : [
        { userId: 'arjun', createdAt: new Date(), partyType: 'PARTICIPANT', ground: { id: 'g-sales', label: 'Sales team, Q4' }, checkIns: [] },
        { userId: 'arjun', createdAt: new Date(), partyType: 'PARTICIPANT', ground: { id: 'g-plan', label: 'Arjun Shah, first ninety days' }, checkIns: [] },
      ])),
    },
    membershipRequest: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    ground: { findMany: jest.fn(async () => mayOpen.map((id) => ({ id }))) },
  };
  return new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
}
const page = { page: 1, limit: 20 } as any;

describe('the People list, read as each admin', () => {
  it('Grace reads the check-in she may open by name, and nothing of the other, not even that it is there', async () => {
    const arjun = (await theList(['g-sales']).findAll('kijani', page, 'grace')).data[0] as any;
    expect(arjun.checkIns).toEqual([{ id: 'g-sales', label: 'Sales team, Q4', runsIt: false }]);
    /* PRIVACY SWEEP: the count is gone. The only check-ins an admin cannot open are evaluations, so a count told her a person was under one. */
    expect(arjun).not.toHaveProperty('checkInsYouCannotOpen');
    expect(JSON.stringify(arjun)).not.toContain('first ninety days');
  });

  it('an admin given access to the plan reads both by name', async () => {
    const arjun = (await theList(['g-sales', 'g-plan']).findAll('kijani', page, 'juma')).data[0] as any;
    expect(arjun.checkIns).toHaveLength(2);
    expect(arjun).not.toHaveProperty('checkInsYouCannotOpen');
  });

  it('with no reader named, no check-in is named', async () => {
    const arjun = (await theList(['g-sales', 'g-plan']).findAll('kijani', page)).data[0] as any;
    expect(arjun.checkIns).toEqual([]);
    expect(arjun).not.toHaveProperty('checkInsYouCannotOpen');
  });
});
