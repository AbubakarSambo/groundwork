import { AuthService } from './auth.service';

/**
 * AN INVITED PERSON WHO SIGNS UP BY LINK LANDS WHERE THEY WERE INVITED (journey test, 12 October).
 *
 * Pia was on Lena's check-in at Brightloom. Asking for a sign-in link from the sign-in page, with no
 * account yet, made "Pia's workspace" with Pia as its admin, and her check-in "isn't available any more".
 * Nobody with a place on a check-in gets a new organisation made on confirming: they are made exactly as
 * opening the invitation makes them. A plain sign-up with nothing waiting still gets its own.
 */
const BRIGHTLOOM = 'o-brightloom';
const future = () => new Date(Date.now() + 3600_000);

function service(opts: { invitedBy?: { role: string; organizationId: string } | null; existingUser?: any; openCheckIn?: string | null; draftToken?: string | null }) {
  const made = { orgs: [] as any[], users: [] as any[], requests: [] as any[], linked: [] as any[] };
  const tx: any = {
    organization: { create: jest.fn(async ({ data }: any) => { const o = { id: 'o-new', ...data }; made.orgs.push(o); return o; }), updateMany: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), update: jest.fn(async () => ({})) },
    user: { create: jest.fn(async ({ data }: any) => { const u = { id: 'u-pia', isActive: true, tokenEpoch: 0, organization: { id: data.organizationId, name: data.organizationId === BRIGHTLOOM ? 'Brightloom' : 'New' }, ...data }; made.users.push(u); return u; }) },
    membershipRequest: { upsert: jest.fn(async ({ create }: any) => { made.requests.push(create); return create; }) },
    organizationMembership: { create: jest.fn(async () => ({})) },
    entryDraft: { create: jest.fn(async () => ({})) },
    groundParticipant: { updateMany: jest.fn(async (args: any) => { made.linked.push(args); return {}; }) },
    pendingSignup: { delete: jest.fn(async () => ({})) },
  };
  const pending = { id: 'p1', email: 'pia@brightloom.test', token: 'link', firstName: 'Pia', lastName: null, orgName: null, passwordHash: null, payload: {}, history: [], draftToken: opts.draftToken ?? null, next: null, expiresAt: future() };
  const prisma: any = {
    pendingSignup: { findUnique: jest.fn(async () => (opts.existingUser ? null : pending)), delete: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) },
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.email) return opts.existingUser ?? null;
        if (where.id === 'lena' && opts.invitedBy) return opts.invitedBy;
        return null;
      }),
      findMany: jest.fn(async () => []),
    },
    groundParticipant: {
      findFirst: jest.fn(async () => (opts.invitedBy ? { groundId: 'g-sales', addedByUserId: 'lena', ground: { organizationId: BRIGHTLOOM, initiatorId: 'lena' } } : null)),
    },
    ground: { findUnique: jest.fn(async () => ({ label: 'Sales team, weekly' })) },
    checkIn: { findFirst: jest.fn(async () => (opts.openCheckIn ? { id: opts.openCheckIn } : null)) },
    person: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    organizationMembership: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
    emailVerificationToken: { create: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), findFirst: jest.fn(async () => null) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const email: any = { sendMagicLinkEmail: jest.fn(async () => ({})), sendSomebodyIsWaiting: jest.fn(async () => ({})) };
  const svc = new AuthService(
    prisma, { sign: () => 'a-session' } as any, { get: () => undefined } as any,
    email, {} as any, { canInviteMember: jest.fn(async () => ({ allowed: true })) } as any, { emit: () => undefined } as any,
  );
  return { svc, made, prisma, tx };
}

describe('a person invited to a check-in who signs up by link instead of opening the invitation', () => {
  it('invited by a lead: no new organisation, a person of Brightloom waiting for an admin, on to "Almost in"', async () => {
    const { svc, made } = service({ invitedBy: { role: 'LEAD', organizationId: BRIGHTLOOM } });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(0);
    expect(made.users).toHaveLength(1);
    expect(made.users[0]).toMatchObject({ organizationId: BRIGHTLOOM, role: 'MEMBER', awaitingOrgApproval: true });
    expect(made.requests[0]).toMatchObject({ organizationId: BRIGHTLOOM, groundId: 'g-sales', viaInvitation: true });
    expect(made.linked[0].data).toEqual({ userId: 'u-pia' });
    expect(res.next).toBe('/join/waiting');
  });

  it('invited by an admin: no new organisation, straight in, on to Today', async () => {
    const { svc, made } = service({ invitedBy: { role: 'ADMIN', organizationId: BRIGHTLOOM } });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(0);
    expect(made.users[0]).toMatchObject({ organizationId: BRIGHTLOOM, role: 'MEMBER', awaitingOrgApproval: false });
    expect(made.requests).toHaveLength(0);
    expect(res.next).toBe('/today');
  });

  /* 12 October, second pass: '/today' made the link's page post /entry/commit for somebody with nothing to
     save. Invited by an admin, they now go straight into their check-in, as opening the invitation does. */
  it('invited by an admin, with a check-in open: no new organisation, straight into that check-in', async () => {
    const { svc, made } = service({ invitedBy: { role: 'ADMIN', organizationId: BRIGHTLOOM }, openCheckIn: 'c-pia-1' });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(0);
    expect(made.users).toHaveLength(1);
    expect(res.next).toBe('/checkin/c-pia-1');
  });

  it('invited by a lead, with a check-in open: still "Almost in", as opening the invitation does', async () => {
    const { svc } = service({ invitedBy: { role: 'LEAD', organizationId: BRIGHTLOOM }, openCheckIn: 'c-pia-1' });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(res.next).toBe('/join/waiting');
  });

  it('a draft written in the entry chat still goes home, so the page saves it', async () => {
    const { svc } = service({ invitedBy: { role: 'ADMIN', organizationId: BRIGHTLOOM }, openCheckIn: 'c-pia-1', draftToken: 'd1' });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(res.next).toBe('/today');
  });

  it('a plain sign-up with nothing waiting still gets its own organisation, as its admin', async () => {
    const { svc, made } = service({ invitedBy: null });
    await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(1);
    expect(made.orgs[0].name).toBe("Pia's workspace");
    expect(made.users[0]).toMatchObject({ organizationId: 'o-new', role: 'ADMIN' });
  });
});

describe('a person already let in who signs in by emailed link', () => {
  it('gets a sign-in link to her own account and no waiting sign-up, so nothing new is made', async () => {
    const pia = { id: 'u-pia', email: 'pia@brightloom.test', firstName: 'Pia', organizationId: BRIGHTLOOM, awaitingOrgApproval: false, isActive: true };
    const { svc, made, prisma } = service({ existingUser: pia });
    await svc.entrySave('pia@brightloom.test');
    expect(prisma.pendingSignup.upsert).not.toHaveBeenCalled();
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'u-pia' }) }));
    expect(made.orgs).toHaveLength(0);
  });

  it('opening that link signs her into Brightloom, where her check-in is', async () => {
    const pia = { id: 'u-pia', email: 'pia@brightloom.test', firstName: 'Pia', organizationId: BRIGHTLOOM, awaitingOrgApproval: false, isActive: true, organization: { id: BRIGHTLOOM, name: 'Brightloom' } };
    const { svc, made } = service({ existingUser: pia });
    jest.spyOn(svc as any, 'consumeToken').mockResolvedValue({ id: 't1', userId: 'u-pia', user: pia, next: null });
    const built = jest.spyOn(svc as any, 'buildAuthResponse').mockResolvedValue({ accessToken: 'a-session' });
    jest.spyOn(svc as any, 'withPasswordSetup').mockImplementation(async (r: any) => r);
    (svc as any).prisma.$transaction = async (fn: any) => fn({
      user: { update: jest.fn(async () => ({})) },
      emailVerificationToken: { update: jest.fn(async () => ({})) },
      groundParticipant: { updateMany: jest.fn(async () => ({})) },
    });
    await svc.verifyEmail({ token: 'sign-in' } as any);
    expect(made.orgs).toHaveLength(0);
    expect((built.mock.calls[0][0] as any).organizationId).toBe(BRIGHTLOOM);
  });
});
