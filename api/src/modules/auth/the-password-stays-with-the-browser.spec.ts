import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { AuthService } from './auth.service';

/**
 * A PASSWORD CHOSEN AT SIGN-UP STAYS WITH THE BROWSER THAT CHOSE IT (U.3 review, a security fix).
 *
 * Hafsah's decision stands: a password may be chosen at sign-up. The hole: anybody could sign up with
 * somebody else's address and a password of their own, and when the owner opened the confirmation
 * the account was made with the stranger's password. Now the password is put on the account only
 * when the confirmation comes back with the key the signing-up browser was given. Anywhere else the
 * password is thrown away, and the person chooses one afterwards, as after a sign-up by link. No
 * answer says which happened.
 */
function world() {
  const db: { pending: any | null; users: any[]; tokens: any[] } = { pending: null, users: [], tokens: [] };
  const tx: any = {
    organization: { create: jest.fn(async ({ data }: any) => ({ id: 'o-new', ...data })), updateMany: jest.fn(async () => ({})) },
    user: { create: jest.fn(async ({ data }: any) => { const u = { id: 'u-new', isActive: true, tokenEpoch: 0, organization: { id: 'o-new', name: 'X' }, ...data }; db.users.push(u); return u; }) },
    organizationMembership: { create: jest.fn(async () => ({})) },
    entryDraft: { create: jest.fn(async () => ({})) },
    groundParticipant: { updateMany: jest.fn(async () => ({})) },
    pendingSignup: { delete: jest.fn(async () => { db.pending = null; return {}; }) },
  };
  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => db.users.find((u) => u.email === where.email) ?? null),
    },
    pendingSignup: {
      upsert: jest.fn(async ({ create, update }: any) => { db.pending = db.pending ? { ...db.pending, ...update } : { id: 'p1', ...create }; return db.pending; }),
      findUnique: jest.fn(async ({ where }: any) => (db.pending && db.pending.token === where.token ? db.pending : null)),
      update: jest.fn(async ({ data }: any) => { db.pending = { ...db.pending, ...data }; return db.pending; }),
    },
    person: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    organizationMembership: { count: jest.fn(async () => 0) },
    emailVerificationToken: {
      findFirst: jest.fn(async () => null),
      updateMany: jest.fn(async () => ({})),
      create: jest.fn(async ({ data }: any) => { db.tokens.push(data); return data; }),
    },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  let mailedToken = '';
  const email: any = { sendMagicLinkEmail: jest.fn(async (_to: string, _n: string, t: string) => { mailedToken = t; }), sendAddPasswordEmail: jest.fn(async () => undefined) };
  const svc = new AuthService(prisma, { sign: () => 'a-session' } as any, { get: () => undefined } as any, email, {} as any, { canInviteMember: async () => ({ allowed: true }) } as any, { emit: () => undefined } as any);
  return { svc, db, link: () => mailedToken };
}

const ADDRESS = 'ama@gmail.com';
const PASSWORD = 'harbour7lamp';

describe('the same browser opens the confirmation', () => {
  it('the password chosen at sign-up is on the account, and signs in', async () => {
    const { svc, db, link } = world();
    const saved = await svc.entrySave(ADDRESS, { payload: { firstName: 'Ama' } }, PASSWORD);
    const res: any = await svc.verifyEmail({ token: link(), passwordKey: saved.passwordKey } as any);
    expect(await bcrypt.compare(PASSWORD, db.users[0].passwordHash)).toBe(true);
    expect(res.needsPassword).toBe(false);
    expect(res).not.toHaveProperty('passwordSetupToken');
    const signedIn = await svc.login({ email: ADDRESS, password: PASSWORD } as any);
    expect(signedIn.accessToken).toBe('a-session');
  });
});

describe('another browser opens it (no key, or the wrong key)', () => {
  it.each([['no key', undefined], ['the wrong key', 'f'.repeat(64)]])('%s: the account has no password, the hash is gone, and the chosen password does not sign in', async (_what, key) => {
    const { svc, db, link } = world();
    await svc.entrySave(ADDRESS, { payload: { firstName: 'Ama' } }, PASSWORD);
    const res: any = await svc.verifyEmail({ token: link(), ...(key ? { passwordKey: key } : {}) } as any);
    expect(db.users[0].passwordHash ?? null).toBeNull();
    expect(db.pending).toBeNull();
    /* They can still choose a password: the step comes, as after a sign-up by link. */
    expect(res.needsPassword).toBe(true);
    expect(res.passwordSetupToken).toEqual(expect.any(String));
    expect(db.tokens.some((t) => t.type === TokenType.PASSWORD_SETUP)).toBe(true);
    /* The stranger's password opens nothing. */
    await expect(svc.login({ email: ADDRESS, password: PASSWORD } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('the hash is thrown away at once, even when the link only asks "Where do you work?" first', async () => {
    const { svc, db, link } = world();
    const orgs = (svc as any).prisma.organization;
    orgs.findMany.mockResolvedValue([{ id: 'o-c', name: 'Coamana' }]);
    await svc.entrySave('ama@coamana.test', undefined, PASSWORD);
    const first: any = await svc.verifyEmail({ token: link() } as any);
    expect(first.whereDoYouWork).toBeDefined();
    expect(db.pending.passwordHash).toBeNull();
    expect(db.pending.passwordKeyHash).toBeNull();
    /* The choice that follows makes the account without it. */
    await svc.verifyEmail({ token: link(), createMyOwn: true } as any);
    expect(db.users[0].passwordHash ?? null).toBeNull();
  });

  it('nothing in the answer says a password had been chosen: it reads exactly as a sign-up by link', async () => {
    const withPassword = world();
    await withPassword.svc.entrySave(ADDRESS, { payload: { firstName: 'Ama' } }, PASSWORD);
    const a: any = await withPassword.svc.verifyEmail({ token: withPassword.link() } as any);
    const byLink = world();
    await byLink.svc.entrySave(ADDRESS, { payload: { firstName: 'Ama' } });
    const b: any = await byLink.svc.verifyEmail({ token: byLink.link() } as any);
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect({ needsPassword: a.needsPassword, justCreated: a.justCreated }).toEqual({ needsPassword: b.needsPassword, justCreated: b.justCreated });
  });
});

describe('the door still gives one answer for every address', () => {
  it('with a password, an address with an account and one without get answers of the same shape', async () => {
    const fresh = world();
    const known = world();
    known.db.users.push({ id: 'u-old', email: ADDRESS, firstName: 'Ama' });
    const a = await fresh.svc.entrySave(ADDRESS, undefined, PASSWORD);
    const b = await known.svc.entrySave(ADDRESS, undefined, PASSWORD);
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect(a.message).toBe(b.message);
    expect(a.passwordKey).toMatch(/^[0-9a-f]{64}$/);
    expect(b.passwordKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('without a password, no key at all, for either', async () => {
    const a = await world().svc.entrySave(ADDRESS);
    expect(a).not.toHaveProperty('passwordKey');
  });
});
