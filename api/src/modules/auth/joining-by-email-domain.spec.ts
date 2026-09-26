import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

/**
 * JOINING BY EMAIL DOMAIN (U.3, Hafsah, 26 September), BY BEHAVIOUR.
 *
 * The admin's switch: "Anyone with an @baridi.co.ke email". Only the admin's own confirmed domain,
 * never a public mail provider, one organisation per domain. Somebody who signs up with that domain
 * is offered it on "Where do you work?", only once their address is confirmed, and joins as "Takes
 * part", through the seat check.
 */
describe('the admin\'s switch', () => {
  function make(o: { email?: string; verified?: boolean; taken?: boolean; on?: string | null } = {}) {
    const updates: any[] = [];
    const prisma: any = {
      organization: {
        findUnique: jest.fn(async () => ({ joinDomain: o.on ?? null })),
        findFirst: jest.fn(async () => (o.taken ? { id: 'other' } : null)),
        update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
      },
      user: { findUnique: jest.fn(async () => ({ email: o.email ?? 'grace@baridi.co.ke', isEmailVerified: o.verified ?? true })) },
    };
    return { users: new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any), updates };
  }

  it('offers the admin\'s own domain', async () => {
    const { users } = make();
    expect(await users.joiningByDomain('o1', 'u1')).toEqual({ on: false, domain: 'baridi.co.ke', whyNot: null });
  });

  it('switching it on sets that domain, and off clears it', async () => {
    const { users, updates } = make();
    await users.setJoiningByDomain('o1', 'u1', true);
    expect(updates[0]).toEqual({ where: { id: 'o1' }, data: { joinDomain: 'baridi.co.ke' } });
    await users.setJoiningByDomain('o1', 'u1', false);
    expect(updates[1]).toEqual({ where: { id: 'o1' }, data: { joinDomain: null } });
  });

  it('never a public mail provider', async () => {
    const { users, updates } = make({ email: 'grace@gmail.com' });
    expect((await users.joiningByDomain('o1', 'u1')).whyNot).toBe('Your email address is at a public mail service, so there is no company domain for people to join by.');
    await expect(users.setJoiningByDomain('o1', 'u1', true)).rejects.toThrow('public mail service');
    expect(updates).toHaveLength(0);
  });

  it('never before the admin\'s own address is confirmed', async () => {
    const { users, updates } = make({ verified: false });
    await expect(users.setJoiningByDomain('o1', 'u1', true)).rejects.toThrow('Your own email address has to be confirmed before people can join by its domain.');
    expect(updates).toHaveLength(0);
  });

  it('one organisation per domain', async () => {
    const { users, updates } = make({ taken: true });
    await expect(users.setJoiningByDomain('o1', 'u1', true)).rejects.toThrow('Another organisation on Groundwork already lets people with an @baridi.co.ke email join it, so this one cannot.');
    expect(updates).toHaveLength(0);
  });
});

describe('the person who signs up with that domain', () => {
  function make(o: { email?: string; verified?: boolean; joinDomain?: string | null; member?: boolean; room?: boolean } = {}) {
    const created: any[] = [];
    const prisma: any = {
      user: {
        findUnique: jest.fn(async () => ({ email: o.email ?? 'miriam@baridi.co.ke', isEmailVerified: o.verified ?? true })),
        update: jest.fn(async ({ data }: any) => ({ id: 'u1', email: 'm', firstName: 'M', lastName: '', organizationId: data.organizationId, role: data.role, isPlatformAdmin: false })),
      },
      organizationMembership: {
        findMany: jest.fn(async () => (o.member ? [{ organizationId: 'baridi' }] : [{ organizationId: 'own' }])),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId_organizationId.organizationId === 'baridi' && !o.member && created.length === 0) return null;
          return { role: 'MEMBER', organization: { id: 'baridi', name: 'Baridi Appliances', slug: 'baridi' } };
        }),
        create: jest.fn(async ({ data }: any) => { created.push(data); return data; }),
      },
      organization: {
        findMany: jest.fn(async ({ where }: any) => (where.joinDomain === 'baridi.co.ke' ? [{ id: 'baridi', name: 'Baridi Appliances' }] : [])),
        findUnique: jest.fn(async () => ({ id: 'baridi', name: 'Baridi Appliances', joinDomain: o.joinDomain === undefined ? 'baridi.co.ke' : o.joinDomain })),
      },
      groundParticipant: { findMany: jest.fn(async () => []) },
    };
    const billing: any = { canInviteMember: jest.fn(async () => ({ allowed: o.room ?? true })) };
    const auth = new AuthService(prisma, { sign: () => 'tok' } as any, { get: () => undefined } as any, {} as any, {} as any, billing, { emit: () => undefined } as any);
    return { auth, created, billing };
  }

  it('is offered the organisation, with no head count', async () => {
    const { auth } = make();
    expect((await auth.whereCanIJoin('u1')).byDomain).toEqual([{ id: 'baridi', name: 'Baridi Appliances', domain: 'baridi.co.ke' }]);
  });

  it('is offered nothing before their address is confirmed', async () => {
    const { auth } = make({ verified: false });
    expect((await auth.whereCanIJoin('u1')).byDomain).toEqual([]);
  });

  it('is not offered one they are already in', async () => {
    const { auth } = make({ member: true });
    expect((await auth.whereCanIJoin('u1')).byDomain).toEqual([]);
  });

  it('joins as "Takes part" (MEMBER), through the seat check, and is switched into it', async () => {
    const { auth, created, billing } = make();
    const res: any = await auth.joinByDomain('u1', 'baridi');
    expect(billing.canInviteMember).toHaveBeenCalledWith('baridi');
    expect(created).toEqual([{ userId: 'u1', organizationId: 'baridi', role: 'MEMBER' }]);
    expect(res.accessToken).toBe('tok');
    expect(res.user.role).toBe('MEMBER');
  });

  it('is refused when the plan has no room, in a sentence, and nothing is joined', async () => {
    const { auth, created } = make({ room: false });
    await expect(auth.joinByDomain('u1', 'baridi')).rejects.toThrow('Baridi Appliances has no room for another person on its plan right now.');
    expect(created).toHaveLength(0);
  });

  it('is refused with another domain, or an unconfirmed address, or when the switch is off', async () => {
    for (const o of [{ email: 'miriam@other.co.ke' }, { verified: false }, { joinDomain: null }]) {
      const { auth, created } = make(o);
      await expect(auth.joinByDomain('u1', 'baridi')).rejects.toThrow('You cannot join that organisation with your email address. Ask somebody there to invite you.');
      expect(created).toHaveLength(0);
    }
  });
});
