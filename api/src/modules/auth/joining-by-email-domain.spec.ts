import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

/**
 * JOINING BY EMAIL DOMAIN (U.3, Hafsah, 26 September; changed 30 September, item 3), BY BEHAVIOUR.
 *
 * The domain starts as the organisation's own FOUNDING email address's domain (`Organization.email`
 * - never whichever admin happens to be looking), and is never a public mail provider. Somebody who
 * signs up with that domain is offered it on "Where do you work?", only once their address is
 * confirmed, and joins as "Takes part", through the seat check. An admin can also name or change
 * the domain outright (`changeJoinDomain`), which always has to be their own confirmed address's
 * domain, so nobody can name a company they are not at.
 */
describe('the admin\'s switch', () => {
  function make(o: { orgEmail?: string | null; joinDomain?: string | null; taken?: boolean } = {}) {
    const updates: any[] = [];
    const prisma: any = {
      organization: {
        findUnique: jest.fn(async () => ({ email: o.orgEmail === undefined ? 'admin@baridi.co.ke' : o.orgEmail, joinDomain: o.joinDomain ?? null })),
        findFirst: jest.fn(async () => (o.taken ? { id: 'other' } : null)),
        update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
      },
    };
    return { users: new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any), updates };
  }

  it('offers the organisation\'s own founding domain, before anybody has switched it on', async () => {
    const { users } = make();
    expect(await users.joiningByDomain('o1')).toEqual({ on: false, domain: 'baridi.co.ke', whyNot: null });
  });

  it('switching it on sets that domain, and off clears it', async () => {
    const { users, updates } = make();
    await users.setJoiningByDomain('o1', true);
    expect(updates[0]).toEqual({ where: { id: 'o1' }, data: { joinDomain: 'baridi.co.ke' } });
    await users.setJoiningByDomain('o1', false);
    expect(updates[1]).toEqual({ where: { id: 'o1' }, data: { joinDomain: null } });
  });

  it('never a public mail provider, and nothing to switch on until an admin names one', async () => {
    const { users, updates } = make({ orgEmail: 'admin@gmail.com' });
    expect((await users.joiningByDomain('o1')).domain).toBeNull();
    expect((await users.joiningByDomain('o1')).whyNot).toBe('No domain is set yet. Your organisation’s email address is on a public mail service. An admin can name the company domain here.');
    await expect(users.setJoiningByDomain('o1', true)).rejects.toThrow('public mail service');
    expect(updates).toHaveLength(0);
  });

  it('one organisation per domain', async () => {
    const { users, updates } = make({ taken: true });
    await expect(users.setJoiningByDomain('o1', true)).rejects.toThrow('Another organisation on Groundwork already lets people with an @baridi.co.ke email join it, so this one cannot.');
    expect(updates).toHaveLength(0);
  });
});

describe('an admin names or changes the domain', () => {
  function make(o: { email?: string; verified?: boolean; taken?: boolean } = {}) {
    const updates: any[] = [];
    const prisma: any = {
      organization: {
        findUnique: jest.fn(async () => ({ email: 'founder@baridi.co.ke', joinDomain: 'baridi.co.ke' })),
        findFirst: jest.fn(async () => (o.taken ? { id: 'other' } : null)),
        update: jest.fn(async (a: any) => { updates.push(a); return {}; }),
      },
      user: { findUnique: jest.fn(async () => ({ email: o.email ?? 'grace@newco.com', isEmailVerified: o.verified ?? true })) },
    };
    return { users: new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any), updates };
  }

  it('sets it to the requesting admin\'s own confirmed domain', async () => {
    const { users, updates } = make();
    expect(await users.changeJoinDomain('o1', 'u1')).toEqual({ on: true, domain: 'baridi.co.ke', whyNot: null });
    expect(updates[0]).toEqual({ where: { id: 'o1' }, data: { joinDomain: 'newco.com' } });
  });

  it('never a public mail provider', async () => {
    const { users, updates } = make({ email: 'grace@gmail.com' });
    await expect(users.changeJoinDomain('o1', 'u1')).rejects.toThrow('public mail service');
    expect(updates).toHaveLength(0);
  });

  it('never before the admin\'s own address is confirmed', async () => {
    const { users, updates } = make({ verified: false });
    await expect(users.changeJoinDomain('o1', 'u1')).rejects.toThrow('Your own email address has to be confirmed before you can name the domain people join by.');
    expect(updates).toHaveLength(0);
  });

  it('one organisation per domain', async () => {
    const { users, updates } = make({ taken: true });
    await expect(users.changeJoinDomain('o1', 'u1')).rejects.toThrow('Another organisation on Groundwork already lets people with an @newco.com email join it, so this one cannot.');
    expect(updates).toHaveLength(0);
  });
});

describe('the person who signs up with that domain', () => {
  function make(o: { email?: string; verified?: boolean; joinDomain?: string | null; member?: boolean; room?: boolean } = {}) {
    const created: any[] = [];
    const prisma: any = {
      user: {
        /*
         * `userShapeFor` (U.8 re-review) reads the user back with its organisation included, after
         * `joinByDomain` switches them into Baridi - so this always names that organisation, the
         * same one `organizationMembership.findUnique` below returns.
         */
        findUnique: jest.fn(async () => ({
          id: 'u1', email: o.email ?? 'miriam@baridi.co.ke', isEmailVerified: o.verified ?? true, firstName: 'M', lastName: '',
          organizationId: 'baridi', role: 'MEMBER', isPlatformAdmin: false,
          organization: { id: 'baridi', name: 'Baridi Appliances', slug: 'baridi', careFeeStatus: null, email: null, companyStage: null, subscriptionPlan: null, whoMayOpenCheckIns: 'EVERYONE', checkInsNeedApproval: false },
        })),
        update: jest.fn(async ({ data }: any) => ({ id: 'u1', email: 'm', firstName: 'M', lastName: '', organizationId: data.organizationId, role: data.role, isPlatformAdmin: false })),
      },
      organizationMembership: {
        findMany: jest.fn(async () => (o.member ? [{ organizationId: 'baridi' }] : [{ organizationId: 'own' }])),
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId_organizationId.organizationId === 'baridi' && !o.member && created.length === 0) return null;
          return { role: 'MEMBER', organization: { id: 'baridi', name: 'Baridi Appliances', slug: 'baridi' } };
        }),
        create: jest.fn(async ({ data }: any) => { created.push(data); return data; }),
        count: jest.fn(async () => 0),
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
    /* U.3 review: the membership also records that they came by their email domain. */
    expect(created).toEqual([{ userId: 'u1', organizationId: 'baridi', role: 'MEMBER', joinedHow: 'domain' }]);
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

/*
 * U.4 review: "Where do you work?" is only for somebody who belongs nowhere yet. An invited person
 * already belongs to the organisation that invited them.
 */
describe('whether somebody belongs anywhere yet', () => {
  function make(orgs: any[]) {
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ email: 'amina@example.test', isEmailVerified: true })) },
      organizationMembership: { findMany: jest.fn(async () => orgs.map((o) => ({ organizationId: o.id }))) },
      organization: {
        findMany: jest.fn(async ({ where }: any) => (where.joinDomain ? [{ id: 'domain-org', name: 'By domain' }] : orgs.filter((o) => where.id.in.includes(o.id)))),
      },
      groundParticipant: { findMany: jest.fn(async () => []) },
    };
    return new AuthService(prisma, { sign: () => 'tok' } as any, { get: () => undefined } as any, {} as any, {} as any, {} as any, { emit: () => undefined } as any);
  }

  it('somebody invited to an organisation belongs somewhere, so is not sent to "Where do you work?"', async () => {
    const auth = make([{ id: 'coamana', ownerUserId: 'sahar', _count: { memberships: 6, grounds: 3 } }]);
    expect((await auth.whereCanIJoin('amina')).nowhereYet).toBe(false);
  });

  it('somebody whose only organisation was just made for them, empty, belongs nowhere yet', async () => {
    const auth = make([{ id: 'own', ownerUserId: 'amina', _count: { memberships: 1, grounds: 0 } }]);
    expect((await auth.whereCanIJoin('amina')).nowhereYet).toBe(true);
  });

  it('and not once they have started a check-in there', async () => {
    const auth = make([{ id: 'own', ownerUserId: 'amina', _count: { memberships: 1, grounds: 1 } }]);
    expect((await auth.whereCanIJoin('amina')).nowhereYet).toBe(false);
  });
});
