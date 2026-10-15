import { AuthService } from './auth.service';
import { theMembershipFollowsTheUser } from '../prisma/prisma.service';

/**
 * JOINING ON CONFIRM MAKES EXACTLY ONE MEMBERSHIP (U.3 re-review).
 *
 * Every test of joining on confirm passed, and every real join failed: "Unique constraint failed on
 * the fields: (user_id, organization_id)". The database client's hook (prisma.service.ts) nests a
 * membership into every user.create, and the join also created one of its own. The mocks had no
 * hook, so they could not see it.
 *
 * So this fake database runs every user.create through the REAL hook function, and refuses a second
 * membership for the same person and organisation exactly as Postgres's unique index does. Not a
 * real-database test: the repo has no harness that runs one against groundwork_dev without touching
 * its rows, and this reproduces the one behaviour that mattered, the hook plus the unique index.
 */
const COAMANA = { id: 'o-coamana', name: 'Coamana' };

function aDatabaseWithTheHook(opts: { pending: any; linkOrg?: boolean; domainOrgs?: any[] }) {
  const memberships: any[] = [];
  const users: any[] = [];
  const addMembership = (m: any) => {
    if (memberships.some((x) => x.userId === m.userId && x.organizationId === m.organizationId)) {
      throw new Error('Unique constraint failed on the fields: (`user_id`,`organization_id`)');
    }
    memberships.push(m);
  };
  const tx: any = {
    organization: { create: jest.fn(async ({ data }: any) => ({ id: 'o-new', ...data })), updateMany: jest.fn(async () => ({})) },
    user: {
      create: jest.fn(async (args: any) => {
        const { args: hooked } = theMembershipFollowsTheUser({ model: 'User', action: 'create', args });
        const { memberships: nested, ...data } = hooked.data;
        const u = { id: 'u-new', isActive: true, tokenEpoch: 0, organization: { id: data.organizationId, name: 'Coamana' }, ...data };
        users.push(u);
        if (nested?.create) addMembership({ userId: u.id, ...nested.create });
        return u;
      }),
    },
    organizationMembership: { create: jest.fn(async ({ data }: any) => { addMembership(data); return data; }) },
    entryDraft: { create: jest.fn(async () => ({})) },
    groundParticipant: { updateMany: jest.fn(async () => ({})) },
    pendingSignup: { delete: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    pendingSignup: { findUnique: jest.fn(async () => opts.pending), update: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(async () => null) },
    person: { findMany: jest.fn(async () => []) },
    /* Nobody here is on a check-in, so the invited-person door (12 October) does not open. */
    groundParticipant: { findFirst: jest.fn(async () => null) },
    organization: {
      findUnique: jest.fn(async ({ where }: any) => (opts.linkOrg && where.inviteLinkCode === 'coamana-6rr7' ? COAMANA : null)),
      findMany: jest.fn(async () => opts.domainOrgs ?? []),
    },
    organizationMembership: { count: jest.fn(async () => 0) },
    emailVerificationToken: { create: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const svc = new AuthService(
    prisma, { sign: () => 'a-session' } as any, { get: () => undefined } as any, {} as any, {} as any,
    { canInviteMember: async () => ({ allowed: true }) } as any, { emit: () => undefined } as any,
  );
  return { svc, memberships, users };
}

const waiting = (over: any = {}) => ({
  id: 'p1', email: 'ama@coamana.test', token: 'link', firstName: 'Ama', lastName: null, orgName: null,
  passwordHash: null, passwordKeyHash: null, payload: {}, history: [], draftToken: null, next: null,
  googleId: null, expiresAt: new Date(Date.now() + 3600_000), ...over,
});

describe('joining on confirm, through the real hook', () => {
  it('from the invite link: one membership, "Takes part", joined by link', async () => {
    const { svc, memberships } = aDatabaseWithTheHook({ pending: waiting({ next: '/j/coamana-6rr7' }), linkOrg: true });
    const res: any = await svc.verifyEmail({ token: 'link' } as any);
    expect(res.accessToken).toBe('a-session');
    expect(memberships).toEqual([{ userId: 'u-new', organizationId: COAMANA.id, role: 'MEMBER', joinedHow: 'link' }]);
  });

  it('from "Where do you work?" then "Join": one membership, joined by domain', async () => {
    const { svc, memberships } = aDatabaseWithTheHook({ pending: waiting(), domainOrgs: [COAMANA] });
    await svc.verifyEmail({ token: 'link', joinOrganizationId: COAMANA.id } as any);
    expect(memberships).toEqual([{ userId: 'u-new', organizationId: COAMANA.id, role: 'MEMBER', joinedHow: 'domain' }]);
  });

  it('after Google, from the invite link: one membership, with the Google id on the account', async () => {
    const { svc, memberships, users } = aDatabaseWithTheHook({ pending: waiting({ next: '/j/coamana-6rr7', googleId: 'g-ama' }), linkOrg: true });
    await svc.verifyEmail({ token: 'link' } as any);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({ organizationId: COAMANA.id, role: 'MEMBER', joinedHow: 'link' });
    expect(users[0].googleId).toBe('g-ama');
  });

  it('a plain sign-up still gets its one membership from the hook, as admin of its own organisation', async () => {
    const { svc, memberships } = aDatabaseWithTheHook({ pending: waiting({ email: 'ama@gmail.com' }) });
    await svc.verifyEmail({ token: 'link' } as any);
    expect(memberships).toEqual([{ userId: 'u-new', organizationId: 'o-new', role: 'ADMIN' }]);
  });
});
