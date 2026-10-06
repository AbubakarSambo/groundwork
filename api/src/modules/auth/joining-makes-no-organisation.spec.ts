import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * JOINING BY AN INVITE LINK OR BY EMAIL DOMAIN MAKES NO ORGANISATION (U.3 review, finding 1).
 *
 * Everybody whose waiting sign-up became an account used to become the admin of a new organisation.
 * So somebody who pressed "Join Coamana" on Coamana's invite link, or whose @coamana.test address
 * Coamana lets join, got an empty organisation of their own as well. What each path now does, on
 * the server, when the emailed link is opened:
 *   - from an open invite link, with a seat: joins it as "Takes part", and no organisation is made;
 *   - with a domain an organisation lets join: nothing is made, and the answer asks "Where do you
 *     work?"; the next answer joins one that was offered, or creates their own;
 *   - a plain sign-up: their own organisation, named as typed, and they are its admin;
 *   - a plain sign-up that left the name empty: "<first name>'s workspace", and they are its admin.
 */
const COAMANA = { id: 'o-coamana', name: 'Coamana' };
const future = () => new Date(Date.now() + 3600_000);

function service(opts: { pending: any; linkOrg?: any; domainOrgs?: any[]; room?: boolean }) {
  const made = { orgs: [] as any[], users: [] as any[], memberships: [] as any[], pendingDeleted: 0 };
  const tx: any = {
    organization: {
      create: jest.fn(async ({ data }: any) => { const o = { id: 'o-new', ...data }; made.orgs.push(o); return o; }),
      updateMany: jest.fn(async () => ({})),
    },
    user: {
      create: jest.fn(async ({ data }: any) => {
        const u = { id: 'u-new', isActive: true, tokenEpoch: 0, organization: { id: data.organizationId, name: data.organizationId === COAMANA.id ? 'Coamana' : 'New' }, ...data };
        made.users.push(u); /* The membership now comes nested in the create (U.3 re-review). */ if (data.memberships?.create) made.memberships.push(data.memberships.create);
        return u;
      }),
    },
    organizationMembership: { create: jest.fn(async ({ data }: any) => { made.memberships.push(data); return data; }) },
    entryDraft: { create: jest.fn(async () => ({})) },
    groundParticipant: { updateMany: jest.fn(async () => ({})) },
    pendingSignup: { delete: jest.fn(async () => { made.pendingDeleted += 1; return {}; }) },
  };
  const prisma: any = {
    pendingSignup: { findUnique: jest.fn(async () => opts.pending), delete: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(async () => null) },
    person: { findMany: jest.fn(async () => []) },
    organization: {
      findUnique: jest.fn(async ({ where }: any) => (where.inviteLinkCode && opts.linkOrg && where.inviteLinkCode === opts.linkOrg.code ? { id: opts.linkOrg.id, name: opts.linkOrg.name } : null)),
      findMany: jest.fn(async () => opts.domainOrgs ?? []),
    },
    organizationMembership: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
    emailVerificationToken: { create: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const billing: any = { canInviteMember: jest.fn(async () => ({ allowed: opts.room ?? true })) };
  const svc = new AuthService(
    prisma, { sign: () => 'a-session' } as any, { get: () => undefined } as any,
    { sendMagicLinkEmail: jest.fn() } as any, {} as any, billing, { emit: () => undefined } as any,
  );
  return { svc, made, billing };
}

const waiting = (over: any = {}) => ({
  id: 'p1', email: 'ama@coamana.test', token: 'link', firstName: 'Ama', lastName: null,
  orgName: null, passwordHash: null, payload: {}, history: [], draftToken: null, next: null,
  expiresAt: future(), ...over,
});

describe('from an organisation\'s invite link', () => {
  it('joins that organisation as "Takes part" on confirming, and makes no organisation', async () => {
    const { svc, made } = service({ pending: waiting({ next: '/j/coamana-6rr7' }), linkOrg: { ...COAMANA, code: 'coamana-6rr7' } });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(0);
    expect(made.users[0]).toMatchObject({ organizationId: COAMANA.id, role: 'MEMBER' });
    expect(made.memberships[0]).toMatchObject({ organizationId: COAMANA.id, role: 'MEMBER', joinedHow: 'link' });
    expect(res.justCreated).toBe(true);
    /* On to Today, not back to the invite's "Join" button. */
    expect(res.next).toBe('/today');
  });

  it('even when a name was typed for an organisation, none is made', async () => {
    const { svc, made } = service({ pending: waiting({ next: '/j/coamana-6rr7', orgName: 'Coamana' }), linkOrg: { ...COAMANA, code: 'coamana-6rr7' } });
    await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(0);
  });

  it('a link that has been turned off since: nothing is made, and "Where do you work?" says why', async () => {
    const { svc, made } = service({ pending: waiting({ email: 'ama@gmail.com', next: '/j/coamana-6rr7' }) });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(0);
    expect(made.users).toHaveLength(0);
    expect(made.pendingDeleted).toBe(0);
    expect(res).not.toHaveProperty('accessToken');
    expect(res.whereDoYouWork).toEqual({ byDomain: [], problem: 'That invite link is not open any more. Ask whoever sent it for the new one.' });
  });

  it('an organisation with no seat left: nothing is made, and the problem is said', async () => {
    const { svc, made } = service({ pending: waiting({ next: '/j/coamana-6rr7' }), linkOrg: { ...COAMANA, code: 'coamana-6rr7' }, room: false });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(0);
    expect(made.users).toHaveLength(0);
    expect(res.whereDoYouWork.problem).toBe('Coamana has no room for another person on its plan right now. Ask an admin there to make room, or to invite you when there is.');
  });
});

describe('with an address whose domain an organisation lets join', () => {
  const pending = waiting({ orgName: 'Coamana' });

  it('makes nothing, and asks where they work, offering that organisation', async () => {
    const { svc, made } = service({ pending, domainOrgs: [COAMANA] });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs).toHaveLength(0);
    expect(made.users).toHaveLength(0);
    expect(made.pendingDeleted).toBe(0);
    expect(res).toEqual({ email: 'ama@coamana.test', whereDoYouWork: { byDomain: [{ id: COAMANA.id, name: 'Coamana', domain: 'coamana.test' }] } });
  });

  it('"Join": joins it as "Takes part", and makes no organisation', async () => {
    const { svc, made } = service({ pending, domainOrgs: [COAMANA] });
    const res: any = await svc.verifyEmail({ token: 'link', joinOrganizationId: COAMANA.id } as any);
    expect(made.orgs).toHaveLength(0);
    expect(made.memberships[0]).toMatchObject({ organizationId: COAMANA.id, joinedHow: 'domain' });
    expect(made.users[0]).toMatchObject({ organizationId: COAMANA.id, role: 'MEMBER' });
    expect(res.accessToken).toBe('a-session');
  });

  it('"Create a new organisation": their own, named as they typed, and they are its admin', async () => {
    const { svc, made } = service({ pending, domainOrgs: [COAMANA] });
    await svc.verifyEmail({ token: 'link', createMyOwn: true } as any);
    expect(made.orgs[0].name).toBe('Coamana');
    expect(made.users[0]).toMatchObject({ organizationId: 'o-new', role: 'ADMIN' });
  });

  it('"Create" goes on to the new organisation\'s Today (U.3 re-review)', async () => {
    const { svc } = service({ pending: waiting({ orgName: 'Ama Ltd', next: '/j/coamana-6rr7' }), domainOrgs: [COAMANA] });
    const res: any = await svc.verifyEmail({ token: 'link', createMyOwn: true } as any);
    expect(res.next).toBe('/today');
  });

  it('"Create" does not reuse a name only suggested from the address: "<first name>\'s workspace" (U.3 re-review)', async () => {
    const { svc, made } = service({ pending: waiting({ orgName: 'Coamana', payload: { orgName: 'Coamana', orgNameSuggested: true } }), domainOrgs: [COAMANA] });
    await svc.verifyEmail({ token: 'link', createMyOwn: true } as any);
    expect(made.orgs[0].name).toBe("Ama's workspace");
  });

  it('a plain sign-up still takes the suggested name, as Hafsah decided', async () => {
    const { svc, made } = service({ pending: waiting({ email: 'ama@acme.test', orgName: 'Acme', payload: { orgName: 'Acme', orgNameSuggested: true } }) });
    await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs[0].name).toBe('Acme');
  });

  it('an organisation that was not offered cannot be joined by naming it', async () => {
    const { svc, made } = service({ pending, domainOrgs: [COAMANA] });
    await expect(svc.verifyEmail({ token: 'link', joinOrganizationId: 'o-somebody-else' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(made.users).toHaveLength(0);
  });

  it('a public mail address is never offered anything', async () => {
    const { svc, made } = service({ pending: waiting({ email: 'ama@gmail.com', orgName: 'Ama Ltd' }), domainOrgs: [COAMANA] });
    await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs[0].name).toBe('Ama Ltd');
  });
});

describe('a plain sign-up, with no link and no domain match (today\'s behaviour, kept)', () => {
  it('with a name typed: their own organisation, called that, and they are its admin', async () => {
    const { svc, made } = service({ pending: waiting({ orgName: 'Ama Ltd' }) });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs[0].name).toBe('Ama Ltd');
    expect(made.users[0].role).toBe('ADMIN');
    expect(res.justCreated).toBe(true);
  });

  it('with the name left empty: "Ama\'s workspace", and they are its admin', async () => {
    const { svc, made } = service({ pending: waiting() });
    await svc.verifyEmail({ token: 'link' } as any);
    expect(made.orgs[0].name).toBe('Ama\'s workspace');
    expect(made.users[0].role).toBe('ADMIN');
  });
});
