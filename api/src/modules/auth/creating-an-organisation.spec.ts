import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

/**
 * "CREATE AN ORGANISATION" (U.3, #/org-new), BY BEHAVIOUR.
 *
 * The organisation gets the name the person typed, the billing email they gave (or their own address
 * when they gave none, because Stripe needs somewhere to send a bill), and what they said about the
 * team's size. They become its admin and its holder, keep the organisation they were in, and are
 * switched into the new one. They may have more than one of their own (Hafsah, 26 September).
 */
function make(opts: { ownsOne?: boolean } = {}) {
  const created: any[] = [];
  const memberships: any[] = [];
  const upserts: any[] = [];
  const tx: any = {
    organization: {
      create: jest.fn(async ({ data }: any) => { created.push(data); return { id: 'org-new', ...data }; }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    organizationMembership: {
      create: jest.fn(async ({ data }: any) => { memberships.push(data); return data; }),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return {}; }),
    },
    user: { findUnique: jest.fn(async () => ({ id: 'u1' })) },
  };
  const prisma: any = {
    user: {
      /*
       * `userShapeFor` (U.8 re-review) reads the user back with its organisation included, once
       * `switchOrganization` has moved them into the new one - so this includes an `organization`
       * object, matching the one `organizationMembership.findUnique` below names.
       */
      findUnique: jest.fn(async () => ({
        id: 'u1', email: 'wairimu@baridi.test', firstName: 'Wairimu', lastName: 'Kamau', organizationId: 'org-old', role: 'ADMIN', isPlatformAdmin: false,
        organization: { id: 'org-new', name: 'Baridi Foundation', slug: 'baridi-foundation', careFeeStatus: null, email: null, companyStage: null, subscriptionPlan: null, whoMayOpenCheckIns: 'EVERYONE', checkInsNeedApproval: false },
      })),
      update: jest.fn(async ({ data }: any) => ({ id: 'u1', email: 'wairimu@baridi.test', firstName: 'Wairimu', lastName: 'Kamau', organizationId: data.organizationId, role: data.role, isPlatformAdmin: false })),
    },
    organization: { findUnique: jest.fn(async () => null) },
    organizationMembership: {
      findFirst: jest.fn(async () => (opts.ownsOne ? { organizationId: 'org-mine' } : null)),
      findUnique: jest.fn(async () => ({ role: 'ADMIN', organization: { id: 'org-new', name: 'Baridi Foundation', slug: 'baridi-foundation' } })),
      count: jest.fn(async () => 0),
    },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const service = new AuthService(
    prisma, { sign: () => 'tok' } as any, { get: () => undefined } as any,
    {} as any, {} as any, {} as any, { emit: () => undefined } as any,
  );
  return { service, prisma, tx, created, memberships, upserts };
}

describe('creating an organisation', () => {
  it('names it what they typed, and makes them its admin', async () => {
    const { service, created, memberships } = make();
    const res = await service.startMyOwnWorkspace('u1', { name: '  Baridi Foundation ' });
    expect(created[0].name).toBe('Baridi Foundation');
    expect(created[0].slug).toBe('baridi-foundation');
    expect(memberships).toContainEqual({ userId: 'u1', organizationId: 'org-new', role: 'ADMIN' });
    expect(res.accessToken).toBe('tok');
    expect(res.organization.name).toBe('Baridi Foundation');
  });

  it('and its holder, so somebody can always be asked about it', async () => {
    const { service, tx } = make();
    await service.startMyOwnWorkspace('u1', { name: 'Baridi Foundation' });
    expect(tx.organization.updateMany).toHaveBeenCalledWith({ where: { id: 'org-new', ownerUserId: null }, data: { ownerUserId: 'u1' } });
  });

  it('keeps the organisation they were in, so they can switch back', async () => {
    const { service, upserts } = make();
    await service.startMyOwnWorkspace('u1', { name: 'Baridi Foundation' });
    expect(upserts[0].where).toEqual({ userId_organizationId: { userId: 'u1', organizationId: 'org-old' } });
    expect(upserts[0].update).toEqual({});
  });

  it('sends bills to the billing email they gave', async () => {
    const { service, created } = make();
    await service.startMyOwnWorkspace('u1', { name: 'Baridi Foundation', billingEmail: ' Finance@Baridi.test ' });
    expect(created[0].email).toBe('finance@baridi.test');
  });

  it('and to their own address when they gave none, because the billing email is optional', async () => {
    const { service, created } = make();
    await service.startMyOwnWorkspace('u1', { name: 'Baridi Foundation' });
    expect(created[0].email).toBe('wairimu@baridi.test');
  });

  it('keeps what they said about the team size, beside the line they were shown', async () => {
    const { service, created } = make();
    await service.startMyOwnWorkspace('u1', { name: 'Baridi Foundation', teamSize: { said: 'fewer', line: 20 } });
    expect(created[0].teamSizeSaid).toBe('fewer');
    expect(created[0].teamSizeLine).toBe(20);
  });

  it('asks nothing about size when they were not asked', async () => {
    const { service, created } = make();
    await service.startMyOwnWorkspace('u1', { name: 'Baridi Foundation' });
    expect(created[0]).not.toHaveProperty('teamSizeSaid');
  });

  it('the one-press door from the organisation menu still names it after them, never the address', async () => {
    const { service, created } = make();
    await service.startMyOwnWorkspace('u1');
    expect(created[0].name).toBe("Wairimu's workspace");
  });

  /* Was "refuses a second organisation of your own". Hafsah, 26 September: more than one is allowed. */
  it('makes a second organisation for somebody who already has one of their own', async () => {
    const { service, created } = make({ ownsOne: true });
    await service.startMyOwnWorkspace('u1', { name: 'Another' });
    expect(created).toHaveLength(1);
    expect(created[0].name).toBe('Another');
  });
});

describe('POST /auth/organizations', () => {
  function controller() {
    const auth: any = { startMyOwnWorkspace: jest.fn(async () => ({ accessToken: 'tok' })) };
    const c = new AuthController(auth, { get: () => undefined } as any);
    return { c, auth };
  }

  it('refuses an empty name in a sentence a person can act on', async () => {
    const { c, auth } = controller();
    await expect(c.createOrganisation({ id: 'u1' } as any, { name: '   ' } as any)).rejects.toThrow(BadRequestException);
    await expect(c.createOrganisation({ id: 'u1' } as any, { name: ' ' } as any)).rejects.toThrow('Give the organisation a name of at least two letters.');
    expect(auth.startMyOwnWorkspace).not.toHaveBeenCalled();
  });

  it('passes the name, the billing email and the team size through, and nothing else', async () => {
    const { c, auth } = controller();
    await c.createOrganisation({ id: 'u1' } as any, { name: ' Baridi Foundation ', billingEmail: 'f@b.test', teamSize: { said: 'more', line: 20 } } as any);
    expect(auth.startMyOwnWorkspace).toHaveBeenCalledWith('u1', { name: 'Baridi Foundation', billingEmail: 'f@b.test', teamSize: { said: 'more', line: 20 } });
  });
});
