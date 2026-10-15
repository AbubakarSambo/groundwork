import { TokenType } from '@prisma/client';
import { AuthService } from './auth.service';
import { hashed } from './a-token-is-stored-as-its-hash';

/**
 * A LINK THAT HAS JUST MADE THE ACCOUNT SAYS SO. U.2.
 *
 * `verifyEmail` is the one moment a waiting sign-up becomes an account (GW-001). When this link was
 * that moment the answer carries `justCreated: true`, and the client shows "Your email is confirmed"
 * before going on. Every other answer from this route (an account that already existed, a sign-in
 * link to an existing account) leaves it out, so nobody signing in for the hundredth time is told
 * their email has just been confirmed.
 */
const ORG = { id: 'o1', name: 'Baridi', slug: 'baridi' };
function service(opts: { pending?: any; existing?: any; listedAs?: any[]; tokenRow?: any }) {
  const tx: any = {
    organization: { create: jest.fn(async ({ data }: any) => ({ ...ORG, ...data })), updateMany: jest.fn(async () => ({})) },
    user: {
      create: jest.fn(async ({ data }: any) => ({ id: 'u-new', isActive: true, tokenEpoch: 0, organization: ORG, ...data })),
      update: jest.fn(async () => ({})),
    },
    entryDraft: { create: jest.fn(async () => ({})) },
    groundParticipant: { updateMany: jest.fn(async () => ({})) },
    pendingSignup: { delete: jest.fn(async () => ({})) },
    person: { update: jest.fn(async () => ({})) },
    emailVerificationToken: { update: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    pendingSignup: { findUnique: jest.fn(async () => opts.pending ?? null), delete: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(async () => opts.existing ?? null) },
    person: { findMany: jest.fn(async () => opts.listedAs ?? []) },
    /* Nobody here is on a check-in, so the invited-person door (12 October) does not open. */
    groundParticipant: { findFirst: jest.fn(async () => null) },
    /* No organisation lets this domain join, and no invite link: the lookup added in the U.3 review. */
    organization: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    organizationMembership: { count: jest.fn(async () => 0) },
    emailVerificationToken: { findUnique: jest.fn(async () => opts.tokenRow ?? null), create: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const svc = new AuthService(
    prisma,
    { sign: () => 'a-session' } as any,
    { get: () => undefined } as any,
    { sendMagicLinkEmail: jest.fn() } as any,
    {} as any,
    {} as any,
    { emit: () => undefined } as any,
  );
  return svc;
}

const waiting = {
  id: 'p1', email: 'wairimu@baridi.test', token: 'link', firstName: 'Wairimu', lastName: null,
  orgName: 'Baridi', passwordHash: null, payload: {}, history: [], draftToken: null,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
};
const anAccount = {
  id: 'u-old', email: 'wairimu@baridi.test', firstName: 'Wairimu', lastName: '', role: 'ADMIN',
  organizationId: 'o1', organization: ORG, isActive: true, tokenEpoch: 0, passwordHash: 'a-hash',
};

describe('verify-email says justCreated only when this link made the account', () => {
  it('a waiting sign-up becomes an account and its organisation: justCreated, and the address to show', async () => {
    const res = await service({ pending: waiting }).verifyEmail({ token: 'link' } as any);
    expect(res.justCreated).toBe(true);
    expect(res.user.email).toBe('wairimu@baridi.test');
    /* No password yet, so the password step still follows the card. */
    expect(res.needsPassword).toBe(true);
    expect(res.passwordSetupToken).toEqual(expect.any(String));
  });

  it('a sign-up that chose a password gets it on the account, so no password step follows', async () => {
    /* U.3 review, a security fix: in the browser that chose it, which presents its key. */
    const res = await service({ pending: { ...waiting, passwordHash: 'a-bcrypt-hash', passwordKeyHash: hashed('the-key') } }).verifyEmail({ token: 'link', passwordKey: 'the-key' } as any);
    expect(res.justCreated).toBe(true);
    expect(res.needsPassword).toBe(false);
    expect(res).not.toHaveProperty('passwordSetupToken');
  });

  it('a waiting sign-up whose company already listed them joins it: that is a new account too', async () => {
    const listed = [{ id: 'person-1', organizationId: 'o1', email: 'wairimu@baridi.test', active: true, linkedUserId: null }];
    const res = await service({ pending: waiting, listedAs: listed }).verifyEmail({ token: 'link' } as any);
    expect(res.justCreated).toBe(true);
  });

  it('a waiting sign-up for an address that got an account some other way meanwhile: not new', async () => {
    const res = await service({ pending: waiting, existing: anAccount }).verifyEmail({ token: 'link' } as any);
    expect(res).not.toHaveProperty('justCreated');
  });

  it('a sign-in link to an account that already exists: not new', async () => {
    const tokenRow = {
      id: 't1', userId: 'u-old', type: TokenType.EMAIL_VERIFICATION, usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), user: anAccount,
    };
    const res = await service({ tokenRow }).verifyEmail({ token: 'sign-in-link' } as any);
    expect(res).not.toHaveProperty('justCreated');
    expect(res.user.email).toBe('wairimu@baridi.test');
  });
});
