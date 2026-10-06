import { TokenType } from '@prisma/client';
import { AuthService } from './auth.service';
import { hashed } from './a-token-is-stored-as-its-hash';

/**
 * A NEW PASSWORD LINK ENDS THE OLDER ONES. U.2 review, Hafsah's rule of 26 September.
 *
 * An older reset link must stop working as soon as a newer one is sent; the same for set-up links.
 * This keeps a small table of links in memory and runs the real service against it, so what is
 * checked is which links still open, not which calls were made.
 */
type Row = { id: string; userId: string; token: string; type: TokenType; usedAt: Date | null; expiresAt: Date; createdAt: Date };
const USER = {
  id: 'u1', email: 'wairimu@baridi.test', firstName: 'Wairimu', lastName: '', role: 'MEMBER', organizationId: 'o1',
  isActive: true, deletedAt: null, isEmailVerified: true, passwordHash: null as string | null, googleId: null, tokenEpoch: 0,
  organization: { id: 'o1', name: 'Baridi', slug: 'baridi' },
};

function world(user = USER) {
  const rows: Row[] = [];
  let n = 0;
  const matches = (r: Row, where: any) =>
    (where.userId === undefined || r.userId === where.userId) &&
    (where.type === undefined || r.type === where.type) &&
    (where.usedAt === undefined || (where.usedAt === null ? r.usedAt === null : true));
  const prisma: any = {
    user: { findUnique: jest.fn(async () => user) },
    organizationMembership: { count: jest.fn(async () => 0) },
    emailVerificationToken: {
      create: jest.fn(async ({ data }: any) => { const r = { id: `t${++n}`, usedAt: null, createdAt: new Date(), ...data }; rows.push(r); return r; }),
      updateMany: jest.fn(async ({ where, data }: any) => { let count = 0; for (const r of rows) if (matches(r, where)) { Object.assign(r, data); count++; } return { count }; }),
      findUnique: jest.fn(async ({ where }: any) => {
        const r = rows.find((x) => x.token === where.token);
        return r ? { ...r, user } : null;
      }),
      findFirst: jest.fn(async () => null),
    },
  };
  const sent: string[] = [];
  const email: any = {
    sendPasswordResetEmail: jest.fn(async (_to: string, _n: string, token: string) => { sent.push(token); return {}; }),
    sendAddPasswordEmail: jest.fn(async (_to: string, _n: string, token: string) => { sent.push(token); return {}; }),
  };
  const svc = new AuthService(prisma, { sign: () => 'jwt' } as any, { get: () => undefined } as any, email, {} as any, {} as any, { emit: () => undefined } as any);
  const opens = async (token: string, type: 'PASSWORD_RESET' | 'PASSWORD_SETUP') => (await svc.validateToken(token, type)).valid;
  return { svc, sent, opens, rows };
}

describe('reset links', () => {
  it('the older one stops working as soon as a newer one is sent; the newer one works', async () => {
    const { svc, sent, opens } = world({ ...USER, passwordHash: 'a-hash' });
    await svc.forgotPassword({ email: USER.email } as any);
    await svc.forgotPassword({ email: USER.email } as any);
    expect(sent).toHaveLength(2);
    expect(await opens(sent[0], 'PASSWORD_RESET')).toBe(false);
    expect(await opens(sent[1], 'PASSWORD_RESET')).toBe(true);
  });
});

describe('set-up links', () => {
  it('a second sign-in attempt without a password sends a new set-up link and ends the first', async () => {
    const { svc, sent, opens } = world();
    await expect(svc.login({ email: USER.email, password: 'x' } as any)).rejects.toThrow();
    await expect(svc.login({ email: USER.email, password: 'x' } as any)).rejects.toThrow();
    expect(sent).toHaveLength(2);
    expect(await opens(sent[0], 'PASSWORD_SETUP')).toBe(false);
    expect(await opens(sent[1], 'PASSWORD_SETUP')).toBe(true);
  });

  it('asking for one from inside the app ends an emailed one', async () => {
    const { svc, sent, opens } = world();
    await expect(svc.login({ email: USER.email, password: 'x' } as any)).rejects.toThrow();
    const { token } = await svc.requestPasswordSetupForUser(USER.id);
    expect(await opens(sent[0], 'PASSWORD_SETUP')).toBe(false);
    expect(await opens(token, 'PASSWORD_SETUP')).toBe(true);
  });

  it('and a new reset link leaves a set-up link alone, because they are different things', async () => {
    const { svc, sent, opens } = world();
    await expect(svc.login({ email: USER.email, password: 'x' } as any)).rejects.toThrow();
    await svc.forgotPassword({ email: USER.email } as any);
    expect(await opens(sent[0], 'PASSWORD_SETUP')).toBe(true);
    expect(await opens(sent[1], 'PASSWORD_RESET')).toBe(true);
  });

  it('links are still looked up by their hash', async () => {
    const { svc, sent, rows } = world();
    await svc.forgotPassword({ email: USER.email } as any);
    expect(rows[0].token).toBe(hashed(sent[0]));
  });
});
