import { AuthService } from './auth.service';

/**
 * SIGNING IN WITH GOOGLE MUST NOT INVENT AN ORGANISATION FOR SOMEONE WHO
 * ALREADY BELONGS TO ONE.
 *
 * Every Google user without an existing account got a brand-new organisation
 * named "<FirstName>'s Workspace". Two problems with that, and the second is the
 * serious one.
 *
 * First, nobody was asked. That name goes on every page their whole team sees,
 * and it was decided by string concatenation. Same shape as the domain-derived
 * org name removed in GW-001 - milder, because a personal workspace claims
 * nobody's company identity, but decided rather than asked all the same.
 *
 * Second, and worse: an invited participant who signs in with Google BEFORE
 * clicking their invite email is not a new company. Somebody has already asked
 * for them by name, on a ground, in an organisation that exists. Giving them a
 * private workspace strands them - they land in an empty org of one, while the
 * ground they were actually invited to sits somewhere they cannot see.
 *
 * So: link to the existing account where there is one, join the inviting
 * organisation where somebody is expecting them, and only otherwise create an
 * organisation - flagging that its name should be ASKED rather than assumed.
 *
 * Google verifies the address, so isEmailVerified is legitimate here in a way it
 * never was for a typed-in email (see nothing-before-verification.spec.ts).
 */

function makeService(over: {
  byGoogleId?: any;
  byEmail?: any;
  invited?: any;
} = {}) {
  const created: any[] = [];
  const prisma: any = {
    user: {
      findFirst: jest.fn(async () => over.byGoogleId ?? null),
      findUnique: jest.fn(async () => over.byEmail ?? null),
      update: jest.fn(async (a: any) => ({
        id: 'u-existing', email: 'k@x.test', isActive: true, organizationId: 'org-existing',
        organization: { id: 'org-existing', name: 'Meridian' }, ...a.data,
      })),
      create: jest.fn(async (a: any) => {
        created.push(a.data);
        return { id: 'u-new', isActive: true, ...a.data, organization: { id: a.data.organizationId, name: 'x' } };
      }),
    },
    organization: { create: jest.fn(async (a: any) => ({ id: 'org-new', ...a.data })), findUnique: jest.fn(async () => null) },
    groundParticipant: { findFirst: jest.fn(async () => over.invited ?? null) },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const svc = new AuthService(
    prisma,
    { sign: () => 'jwt' } as any,
    { get: () => undefined } as any,
    { sendMagicLinkEmail: async () => undefined, sendAddPasswordEmail: async () => undefined } as any,
    {} as any, {} as any,
  );
  return { svc, prisma, created };
}

const profile = { googleId: 'g-1', email: 'K@X.test', firstName: 'Kavon', lastName: 'B' };

describe('signing in with Google', () => {
  it('joins the organisation that invited them, rather than making one of their own', async () => {
    // THE REGRESSION: an invited participant got a private workspace and was
    // separated from the ground they were asked to join.
    const { svc, created } = makeService({ invited: { ground: { organizationId: 'org-inviting' } } });

    const res = await svc.findOrCreateGoogleUser(profile);

    expect(created[0].organizationId).toBe('org-inviting');
    expect(created[0].role).toBe('MEMBER');
    expect(res.needsOrgName).toBe(false);   // never ask someone to name another org
  });

  it('creates no organisation at all for an invited person', async () => {
    const { svc, prisma } = makeService({ invited: { ground: { organizationId: 'org-inviting' } } });
    await svc.findOrCreateGoogleUser(profile);
    expect(prisma.organization.create).not.toHaveBeenCalled();
  });

  it('asks for a name when nobody is expecting them', async () => {
    const { svc, prisma } = makeService();
    const res = await svc.findOrCreateGoogleUser(profile);
    // They still get somewhere to be, and a default so nothing is blank...
    expect(prisma.organization.create).toHaveBeenCalled();
    // ...but the caller is told to ask rather than let the guess stand.
    expect(res.needsOrgName).toBe(true);
    expect(res.isNewUser).toBe(true);
  });

  it('links Google to an existing account without touching their organisation', async () => {
    const { svc, prisma } = makeService({
      byEmail: { id: 'u-existing', email: 'k@x.test', isActive: true, organizationId: 'org-existing', organization: { id: 'org-existing' } },
    });

    const res = await svc.findOrCreateGoogleUser(profile);

    expect(prisma.organization.create).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
    expect(res.isNewUser).toBe(false);
    expect(res.needsOrgName).toBe(false);
  });

  it('signs a returning Google user straight in', async () => {
    const { svc, prisma } = makeService({
      byGoogleId: { id: 'u1', isActive: true, organizationId: 'org1', organization: { id: 'org1' } },
    });

    const res = await svc.findOrCreateGoogleUser(profile);

    expect(res.isNewUser).toBe(false);
    expect(res.needsOrgName).toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.organization.create).not.toHaveBeenCalled();
  });

  it('matches the invite on the address Google gives, whatever its case', async () => {
    // Invites are stored lowercase; Google hands back whatever the person typed.
    const { svc, prisma } = makeService({ invited: { ground: { organizationId: 'org-inviting' } } });
    await svc.findOrCreateGoogleUser({ ...profile, email: 'K@X.TEST' });
    expect(prisma.groundParticipant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ email: 'k@x.test' }) }),
    );
  });
});
