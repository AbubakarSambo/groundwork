import { UsersService } from './users.service';

/**
 * B-030: People for an organisation made before the rebuild listed seven people with an empty first and
 * last name and nothing but an address, so a screen had only the address to put where a name goes. Every
 * row now carries the name to show: theirs, or a plain stand-in (decision 115).
 */
function aService(members: any[], held: any[] = []) {
  const prisma: any = {
    organizationMembership: { findMany: jest.fn(async ({ where }: any) => (where.user ? members : [])), count: jest.fn(async () => members.length) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => (where.awaitingSeat ? held : [])) },
    membershipRequest: { findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    ground: { findMany: jest.fn(async () => []) },
  };
  return new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
}
const member = (id: string, firstName: string, lastName: string) => ({
  role: 'MEMBER', heldForASeat: false,
  user: { id, email: `${id}@riverbank.test`, firstName, lastName, isActive: true, isEmailVerified: true, createdAt: new Date('2026-09-01'), phoneNumber: null, awaitingOrgApproval: false },
});

describe('the name to show for each person in the people list', () => {
  it('is their name, or a plain sentence where there is none, and never the address', async () => {
    const r: any = await aService([member('dov', 'Dov', 'Ellison'), member('hk9', '', ''), member('pia', 'Pia', '')]).findAll('riverbank', { page: 1, limit: 20 } as any, 'mira');
    const by = (email: string) => r.data.find((m: any) => m.email === email);
    expect(by('dov@riverbank.test').displayName).toBe('Dov Ellison');
    expect(by('pia@riverbank.test').displayName).toBe('Pia');
    expect(by('hk9@riverbank.test').displayName).toBe('Someone who has not given a name yet');
    for (const m of r.data) expect(m.displayName).not.toMatch(/@/);
  });

  it('is "Somebody invited by email" for a person added to a check-in with no seat', async () => {
    const held = [{ id: 'gp1', email: 'zawadi@example.test', createdAt: new Date('2026-09-27'), ground: { id: 'g', label: 'Sales team, Q3' } }];
    const r: any = await aService([], held).findAll('riverbank', { page: 1, limit: 20 } as any, 'mira');
    expect(r.data[0].displayName).toBe('Somebody invited by email');
  });
});
