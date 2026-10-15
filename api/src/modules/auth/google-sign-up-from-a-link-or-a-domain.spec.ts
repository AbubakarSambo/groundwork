import { ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleStartGuard } from './google-callback.guard';

/**
 * SIGNING UP WITH GOOGLE FROM AN INVITE LINK OR WITH A DOMAIN AN ORGANISATION LETS JOIN (U.3 review).
 *
 * Google used to make the person's own organisation whatever they came from. Now it takes the same
 * path as an email sign-up: nothing is made, a waiting sign-up proved by Google is kept, and the
 * browser goes to /verify-email with its token, where verifyEmail joins an open link with a seat or
 * asks "Where do you work?". A plain Google sign-up is as before.
 */
const COAMANA = { id: 'o-coamana', name: 'Coamana' };
const profile = { googleId: 'g-ama', email: 'Ama@Coamana.test', firstName: 'Ama', lastName: 'Owusu' };

function service(opts: { linkOrg?: any; domainOrgs?: any[]; pending?: any } = {}) {
  const made = { orgs: [] as any[], users: [] as any[], memberships: [] as any[], pendings: [] as any[] };
  const tx: any = {
    organization: {
      create: jest.fn(async ({ data }: any) => { const o = { id: 'o-new', ...data }; made.orgs.push(o); return o; }),
      updateMany: jest.fn(async () => ({})),
    },
    user: { create: jest.fn(async ({ data }: any) => { const u = { id: 'u-new', isActive: true, tokenEpoch: 0, organization: { id: data.organizationId, name: 'Coamana' }, ...data }; made.users.push(u); /* The membership now comes nested in the create (U.3 re-review). */ if (data.memberships?.create) made.memberships.push(data.memberships.create); return u; }) },
    organizationMembership: { create: jest.fn(async ({ data }: any) => { made.memberships.push(data); return data; }) },
    entryDraft: { create: jest.fn(async () => ({})) },
    groundParticipant: { updateMany: jest.fn(async () => ({})) },
    pendingSignup: { delete: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    user: { findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null) },
    groundParticipant: { findFirst: jest.fn(async () => null) },
    person: { findMany: jest.fn(async () => []) },
    pendingSignup: {
      upsert: jest.fn(async (a: any) => { made.pendings.push(a); return {}; }),
      findUnique: jest.fn(async () => opts.pending ?? null),
    },
    organization: {
      findUnique: jest.fn(async ({ where }: any) => (where.inviteLinkCode && opts.linkOrg && where.inviteLinkCode === opts.linkOrg.code ? COAMANA : null)),
      findMany: jest.fn(async () => opts.domainOrgs ?? []),
      create: tx.organization.create,
      updateMany: tx.organization.updateMany,
    },
    organizationMembership: { count: jest.fn(async () => 0) },
    emailVerificationToken: { create: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const svc = new AuthService(
    prisma, { sign: () => 'a-session' } as any, { get: () => undefined } as any, {} as any, {} as any,
    { canInviteMember: jest.fn(async () => ({ allowed: true })) } as any, { emit: () => undefined } as any,
  );
  return { svc, made };
}

describe('Google, from an organisation\'s invite link', () => {
  it('makes nothing, keeps a waiting sign-up proved by Google with the place, and hands back its token', async () => {
    const { svc, made } = service({ linkOrg: { code: 'coamana-6rr7' } });
    const res = await svc.findOrCreateGoogleUser(profile, '/j/coamana-6rr7');
    expect(res.pendingToken).toEqual(expect.any(String));
    expect(res).not.toHaveProperty('token');
    expect(made.orgs).toHaveLength(0);
    expect(made.users).toHaveLength(0);
    const kept = made.pendings[0].create;
    expect(kept).toMatchObject({ email: 'ama@coamana.test', googleId: 'g-ama', next: '/j/coamana-6rr7', passwordHash: null, orgName: null });
  });

  it('then the confirmation joins the link\'s organisation as "Takes part", with Google, and asks for no password', async () => {
    const first = service({ linkOrg: { code: 'coamana-6rr7' } });
    const { pendingToken } = await first.svc.findOrCreateGoogleUser(profile, '/j/coamana-6rr7') as any;
    const waiting = { id: 'p1', email: 'ama@coamana.test', ...first.made.pendings[0].create, token: pendingToken };
    const second = service({ linkOrg: { code: 'coamana-6rr7' }, pending: waiting });
    const res: any = await second.svc.verifyEmail({ token: pendingToken } as any);
    expect(second.made.orgs).toHaveLength(0);
    expect(second.made.users[0]).toMatchObject({ organizationId: COAMANA.id, role: 'MEMBER', googleId: 'g-ama' });
    expect(second.made.memberships[0]).toMatchObject({ organizationId: COAMANA.id, joinedHow: 'link' });
    expect(res.needsPassword).toBe(false);
    expect(res).not.toHaveProperty('passwordSetupToken');
    expect(res.next).toBe('/today');
  });

  it('a password or draft left on an earlier, unproved sign-up for the address is not kept', async () => {
    const { svc, made } = service({ linkOrg: { code: 'coamana-6rr7' } });
    await svc.findOrCreateGoogleUser(profile, '/j/coamana-6rr7');
    expect(made.pendings[0].update).toMatchObject({ passwordHash: null, orgName: null, draftToken: null, payload: {}, history: [] });
  });

  it('a link that was turned off: still nothing is made, and the confirmation says why', async () => {
    const { svc, made } = service();
    const res = await svc.findOrCreateGoogleUser({ ...profile, email: 'ama@gmail.com' }, '/j/coamana-6rr7');
    expect(res.pendingToken).toEqual(expect.any(String));
    expect(made.orgs).toHaveLength(0);
  });
});

describe('Google, with a domain an organisation lets join', () => {
  it('makes nothing, and the confirmation asks "Where do you work?"', async () => {
    const first = service({ domainOrgs: [COAMANA] });
    const { pendingToken } = await first.svc.findOrCreateGoogleUser(profile) as any;
    expect(first.made.orgs).toHaveLength(0);
    const waiting = { id: 'p1', email: 'ama@coamana.test', ...first.made.pendings[0].create, token: pendingToken };
    const res: any = await service({ domainOrgs: [COAMANA], pending: waiting }).svc.verifyEmail({ token: pendingToken } as any);
    expect(res.whereDoYouWork.byDomain).toEqual([{ id: COAMANA.id, name: 'Coamana', domain: 'coamana.test' }]);
  });
});

describe('a plain Google sign-up, with no link and no domain match', () => {
  it('is as before: their own workspace, and the name is asked for', async () => {
    const { svc, made } = service();
    const res = await svc.findOrCreateGoogleUser({ ...profile, email: 'ama@gmail.com' });
    expect(res.token).toBe('a-session');
    expect(res.needsOrgName).toBe(true);
    expect(made.orgs[0].name).toBe("Ama's Workspace");
    expect(made.pendings).toHaveLength(0);
  });
});

describe('the trip to Google carries the place as `state`', () => {
  const ctx = (query: any) => ({ switchToHttp: () => ({ getRequest: () => ({ query }) }) }) as unknown as ExecutionContext;
  it('a path inside the app goes as state', () => {
    expect(new GoogleStartGuard().getAuthenticateOptions(ctx({ next: '/j/coamana-6rr7' }))).toEqual({ state: '/j/coamana-6rr7' });
  });
  it('an outside address is dropped', () => {
    expect(new GoogleStartGuard().getAuthenticateOptions(ctx({ next: 'https://evil.test' }))).toEqual({});
    expect(new GoogleStartGuard().getAuthenticateOptions(ctx({}))).toEqual({});
  });
});
