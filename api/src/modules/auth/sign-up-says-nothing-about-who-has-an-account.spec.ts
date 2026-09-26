import { AuthService } from './auth.service';

/**
 * SIGN-UP SAYS NOTHING ABOUT WHO HAS AN ACCOUNT. U.2 review, Hafsah's rule of 26 September.
 *
 * entry-save answered an address with no account with a draftToken and an address with an account
 * without one, so the reply alone told an outsider which addresses are registered. Two addresses,
 * one with an account and one without, now get replies with exactly the same fields, with and
 * without a draft, and on the double-tap path too.
 */
function service(existingUser: any, recentToken: any = null) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => existingUser) },
    entryDraft: { upsert: jest.fn(), update: jest.fn(), create: jest.fn() },
    pendingSignup: { upsert: jest.fn(async () => ({})) },
    emailVerificationToken: { findFirst: jest.fn(async () => recentToken), updateMany: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
  };
  const email: any = { sendMagicLinkEmail: jest.fn(async () => undefined) };
  return new AuthService(prisma, {} as any, { get: () => undefined } as any, email, {} as any, {} as any, { emit: () => undefined } as any);
}
const ACCOUNT = { id: 'u1', email: 'hafsah@coamana.test', firstName: 'Hafsah' };
const DRAFT = { payload: { groundLabel: 'Q3 paying customers' }, history: [{ role: 'user', content: 'hello' }] };
const shape = (r: any) => ({ fields: Object.keys(r).sort(), token: typeof r.draftToken === 'string' ? r.draftToken.length : null, message: r.message });

describe('two addresses, one with an account and one without', () => {
  it('with a draft (the entry chat): the same fields, and tokens of the same shape', async () => {
    const withAccount = await service(ACCOUNT).entrySave('hafsah@coamana.test', DRAFT);
    const without = await service(null).entrySave('nobody@example.test', DRAFT);
    expect(shape(withAccount)).toEqual(shape(without));
    expect(shape(without)).toEqual({ fields: ['draftToken', 'email', 'message'], token: 64, message: 'Check your email for your sign-in link.' });
  });

  it('without a draft (sign-up and sign-in links): the same fields, and no token for either', async () => {
    const withAccount = await service(ACCOUNT).entrySave('hafsah@coamana.test');
    const without = await service(null).entrySave('nobody@example.test');
    expect(shape(withAccount)).toEqual(shape(without));
    expect(withAccount).not.toHaveProperty('draftToken');
  });

  it('and on the double-tap path, which reuses a link sent a moment ago', async () => {
    const withAccount = await service(ACCOUNT, { token: 'fresh' }).entrySave('hafsah@coamana.test', DRAFT);
    const without = await service(null).entrySave('nobody@example.test', DRAFT);
    expect(shape(withAccount)).toEqual(shape(without));
  });
});
