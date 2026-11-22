import * as bcrypt from 'bcrypt';
import { AuthService, YOUR_SIGN_UP_IS_NOT_FINISHED } from './auth.service';
import { THE_SAME_ANSWER_EITHER_WAY } from './one-answer-at-the-door';

/**
 * B-192, the server half. Halima set a password, opened the link, left before choosing an organisation, and so has no account. Signing in with her password said
 * "We have emailed you a sign-in link ... Check it and try again" and sent nothing. If the password is the one she set, she is now told what is left and the link is sent
 * again. Anybody else still reads the one answer, so nothing is learnt about a stranger's address.
 */
describe('B-192: signing in before the account was finished', () => {
  async function world() {
    const pending: any = { id: 'ps1', email: 'halima@msingi.test', firstName: 'Halima', passwordHash: await bcrypt.hash('Halima-Pass-1', 4), token: 'old', expiresAt: new Date('2026-01-01') };
    const prisma: any = {
      user: { findUnique: jest.fn(async () => null) },
      pendingSignup: { findUnique: jest.fn(async () => pending), update: jest.fn(async ({ data }: any) => Object.assign(pending, data)) },
    };
    const email: any = { sendVerificationEmail: jest.fn(async () => undefined) };
    const svc = new AuthService(prisma, {} as any, { get: () => undefined } as any, email, {} as any, {} as any, { emit: jest.fn() } as any);
    return { svc, prisma, email, pending };
  }
  it('with the password she set, she is told what is left and the link goes again, new', async () => {
    const { svc, email, pending } = await world();
    await expect(svc.login({ email: 'Halima@Msingi.test', password: 'Halima-Pass-1' } as any)).rejects.toThrow(YOUR_SIGN_UP_IS_NOT_FINISHED);
    expect(YOUR_SIGN_UP_IS_NOT_FINISHED).toBe('You have not finished signing up yet. We have emailed you the link again. Open it, say where you work, and then sign in with your password.');
    expect(email.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(email.sendVerificationEmail.mock.calls[0][0]).toBe('halima@msingi.test');
    expect(pending.token).not.toBe('old');
    expect(pending.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
  it('with any other password, the one answer at the door, and no mail', async () => {
    const { svc, email } = await world();
    await expect(svc.login({ email: 'halima@msingi.test', password: 'a-guess' } as any)).rejects.toThrow(THE_SAME_ANSWER_EITHER_WAY);
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
