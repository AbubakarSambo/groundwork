import { UsersService } from './users.service';
import { theInvitedRowAsServed } from '../grounds/the-invited-row-as-served';

/**
 * THE NAME THE LEAD TYPED IS THE NAME SHOWN (journey test, 12 October 2026).
 *
 * Lena added "pia alpha <pia@brightloom.test>". Since 8b93e271f the name is kept as the name given, but
 * People still read "Somebody invited by email" for somebody on a check-in waiting for a seat, because
 * that row never read the name given, and the row Lena was given back when she added somebody twice had
 * no name either. The name is shown exactly as she typed it, lower case included.
 */
describe('People, for somebody waiting for a seat', () => {
  const make = (held: any[]) => {
    const prisma: any = {
      organizationMembership: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
      groundParticipant: { findMany: jest.fn(async () => held) },
      membershipRequest: { findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
      ground: { findMany: jest.fn(async () => []) },
    };
    const billing: any = { whoIsOverThePlan: async () => ({ over: 0, held: new Set(), saying: null }) };
    return new UsersService(prisma, {} as any, billing, {} as any, { emit: () => undefined } as any);
  };
  const at = new Date('2026-10-11T22:00:00Z');

  it('reads the name the lead typed, as she typed it', async () => {
    const r: any = await make([{ id: 'p1', email: 'pia@brightloom.test', createdAt: at, nameGiven: 'pia alpha', ground: { id: 'g1', label: 'Sales team, weekly' } }])
      .findAll('org', { page: 1, limit: 20 } as any, 'ada');
    const row = r.data.find((m: any) => m.email === 'pia@brightloom.test');
    expect(row.displayName).toBe('pia alpha');
  });

  it('still says "Somebody invited by email" when no name was given', async () => {
    const r: any = await make([{ id: 'p2', email: 'cara@brightloom.test', createdAt: at, nameGiven: null, ground: { id: 'g1', label: 'Sales team, weekly' } }])
      .findAll('org', { page: 1, limit: 20 } as any, 'ada');
    expect(r.data.find((m: any) => m.email === 'cara@brightloom.test').displayName).toBe('Somebody invited by email');
  });
});

describe('the row the lead is given back when she adds somebody already added', () => {
  it('carries the name she typed', () => {
    expect(theInvitedRowAsServed({ id: 'p1', email: 'pia@brightloom.test', nameGiven: 'pia alpha', inviteToken: 'secret' })).toMatchObject({ nameGiven: 'pia alpha' });
    expect(theInvitedRowAsServed({ id: 'p1', inviteToken: 'secret' })).not.toHaveProperty('inviteToken');
  });
});
