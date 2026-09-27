import { TokenType } from '@prisma/client';
import { AuthService } from './auth.service';
import { aPathInThisApp, theInviteLinkCodeIn } from '../../common/a-path-in-this-app';

/**
 * THE CONFIRMATION KEEPS THE PLACE (U.3 review, finding 2).
 *
 * "Join Coamana" on /j/coamana-6rr7 goes to sign-up with next=/j/coamana-6rr7. The link in the
 * mailbox is /verify-email?token=… with no `next`, so after "Your email is confirmed" the person used
 * to land on "Where do you work?", not the invite. The server now keeps the place with the waiting
 * sign-up (or the sign-in link) and hands it back when the link opens, and only ever a path inside
 * this app.
 */
function service(opts: { existingUser?: any; pending?: any; tokenRow?: any } = {}) {
  const upserts: any[] = [];
  const tokens: any[] = [];
  const tx: any = {
    organization: { create: jest.fn(async ({ data }: any) => ({ id: 'o-new', ...data })), updateMany: jest.fn(async () => ({})) },
    user: { create: jest.fn(async ({ data }: any) => ({ id: 'u-new', isActive: true, tokenEpoch: 0, organization: { id: data.organizationId, name: 'X' }, ...data })), update: jest.fn(async () => ({})) },
    organizationMembership: { create: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) },
    entryDraft: { create: jest.fn(async () => ({})) },
    groundParticipant: { updateMany: jest.fn(async () => ({})) },
    pendingSignup: { delete: jest.fn(async () => ({})) },
    emailVerificationToken: { update: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    user: { findUnique: jest.fn(async () => opts.existingUser ?? null) },
    pendingSignup: {
      upsert: jest.fn(async (a: any) => { upserts.push(a); return {}; }),
      findUnique: jest.fn(async () => opts.pending ?? null),
      delete: jest.fn(async () => ({})),
    },
    person: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    organizationMembership: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
    emailVerificationToken: {
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => opts.tokenRow ?? null),
      updateMany: jest.fn(async () => ({})),
      create: jest.fn(async (a: any) => { tokens.push(a); return {}; }),
    },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const svc = new AuthService(
    prisma, { sign: () => 'a-session' } as any, { get: () => undefined } as any,
    { sendMagicLinkEmail: jest.fn(async () => undefined) } as any, {} as any,
    { canInviteMember: jest.fn(async () => ({ allowed: true })) } as any, { emit: () => undefined } as any,
  );
  return { svc, upserts, tokens };
}

describe('only a path inside this app is ever kept', () => {
  it.each([
    ['/j/coamana-6rr7', '/j/coamana-6rr7'],
    ['/invite?token=abc', '/invite?token=abc'],
    ['https://evil.test/j/x', null],
    ['//evil.test', null],
    ['/\\evil.test', null],
    ['/javascript:alert(1)', null],
    ['/j/a b', null],
    ['/signout', null],
    ['', null],
  ])('%s is kept as %s', (raw, kept) => {
    expect(aPathInThisApp(raw)).toBe(kept);
  });

  it('reads the invite code out of /j/<code> and nothing else', () => {
    expect(theInviteLinkCodeIn('/j/coamana-6rr7')).toBe('coamana-6rr7');
    expect(theInviteLinkCodeIn('/j/coamana-6rr7/extra')).toBeNull();
    expect(theInviteLinkCodeIn('/today')).toBeNull();
  });
});

describe('asking for the link keeps where they were going', () => {
  it('a new address: the place is kept with the waiting sign-up', async () => {
    const { svc, upserts } = service();
    await svc.entrySave('ama@coamana.test', { payload: { firstName: 'Ama' } }, undefined, '/j/coamana-6rr7');
    expect(upserts[0].create.next).toBe('/j/coamana-6rr7');
    expect(upserts[0].update.next).toBe('/j/coamana-6rr7');
  });

  it('an outside address is dropped, never kept', async () => {
    const { svc, upserts } = service();
    await svc.entrySave('ama@coamana.test', undefined, undefined, 'https://evil.test/');
    expect(upserts[0].create.next).toBeNull();
    expect(upserts[0].update).not.toHaveProperty('next');
  });

  it('an existing account: the place is kept with the sign-in link, and the answer is the same as for a new address', async () => {
    const known = service({ existingUser: { id: 'u1', email: 'ama@coamana.test', firstName: 'Ama' } });
    const fresh = service();
    const a = await known.svc.entrySave('ama@coamana.test', undefined, undefined, '/j/coamana-6rr7');
    const b = await fresh.svc.entrySave('ama@coamana.test', undefined, undefined, '/j/coamana-6rr7');
    expect(known.tokens[0].data.next).toBe('/j/coamana-6rr7');
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect(a.message).toBe(b.message);
  });
});

describe('opening the link hands the place back', () => {
  const future = new Date(Date.now() + 3600_000);

  it('a sign-in link to an existing account comes back with its place', async () => {
    const user = { id: 'u1', email: 'ama@coamana.test', firstName: 'Ama', lastName: '', role: 'MEMBER', organizationId: 'o1', organization: { id: 'o1', name: 'Coamana' }, isActive: true, tokenEpoch: 0, passwordHash: 'h' };
    const tokenRow = { id: 't1', userId: 'u1', type: TokenType.EMAIL_VERIFICATION, usedAt: null, expiresAt: future, user, next: '/j/coamana-6rr7' };
    const res = await service({ tokenRow }).svc.verifyEmail({ token: 'x' } as any);
    expect(res.next).toBe('/j/coamana-6rr7');
  });

  it('a value that is not a path in this app is never handed back, even if it was stored', async () => {
    const user = { id: 'u1', email: 'ama@coamana.test', firstName: 'Ama', lastName: '', role: 'MEMBER', organizationId: 'o1', organization: { id: 'o1', name: 'Coamana' }, isActive: true, tokenEpoch: 0, passwordHash: 'h' };
    const tokenRow = { id: 't1', userId: 'u1', type: TokenType.EMAIL_VERIFICATION, usedAt: null, expiresAt: future, user, next: '//evil.test' };
    const res = await service({ tokenRow }).svc.verifyEmail({ token: 'x' } as any);
    expect(res).not.toHaveProperty('next');
  });

  it('a plain sign-up with no place: no next', async () => {
    const pending = { id: 'p1', email: 'ama@gmail.com', token: 'x', firstName: 'Ama', lastName: null, orgName: null, passwordHash: null, payload: {}, history: [], draftToken: null, next: null, expiresAt: future };
    const res = await service({ pending }).svc.verifyEmail({ token: 'x' } as any);
    expect(res).not.toHaveProperty('next');
  });
});
