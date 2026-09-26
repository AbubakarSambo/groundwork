import { AuthService } from './auth.service';

/**
 * THE SAME ANSWER FOR EVERY ADDRESS, EVEN ON A DEVELOPMENT MACHINE. U.2 review.
 *
 * forgot-password and member-signin answered with a `devUrl` when the email service was in
 * development mode, and only when the address had an account, since only then was a link made. So
 * the answer said which addresses were registered. Hafsah's rule (26 September): signing in and
 * signing up never reveal whether an address has an account, and a setting that would reveal it is
 * off outside tests. The link now goes only to the server log, where the email service writes every
 * link it would have sent, and the two answers are identical.
 */
const ACCOUNT = { id: 'u1', email: 'wairimu@baridi.test', firstName: 'Wairimu', isActive: true, deletedAt: null };

function service(user: any) {
  const prisma: any = {
    user: { findUnique: jest.fn(async () => user) },
    emailVerificationToken: {
      updateMany: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
      findFirst: jest.fn(async () => null),
    },
  };
  /* The email service in development mode: it hands back the link it would have sent. */
  const email: any = {
    sendPasswordResetEmail: jest.fn(async () => ({ devUrl: 'http://localhost:5173/reset-password?token=secret' })),
    sendSignInLinkEmail: jest.fn(async () => ({ devUrl: 'http://localhost:5173/verify-email?token=secret' })),
  };
  return new AuthService(prisma, {} as any, { get: () => undefined } as any, email, {} as any, {} as any, { emit: () => undefined } as any);
}

describe('forgot-password', () => {
  it('answers an address with an account exactly as one without', async () => {
    const withAccount = await service(ACCOUNT).forgotPassword({ email: 'wairimu@baridi.test' } as any);
    const without = await service(null).forgotPassword({ email: 'nobody@baridi.test' } as any);
    expect(withAccount).toEqual(without);
    expect(JSON.stringify(withAccount)).not.toMatch(/devUrl|token/);
  });
});

describe('member-signin', () => {
  it('answers an address with an account exactly as one without, apart from echoing the address typed', async () => {
    const withAccount = await service(ACCOUNT).memberSignin({ email: 'wairimu@baridi.test' } as any);
    const without = await service(null).memberSignin({ email: 'wairimu@baridi.test' } as any);
    expect(withAccount).toEqual(without);
    expect(JSON.stringify(withAccount)).not.toMatch(/devUrl|token/);
  });
});
