import { AuthService } from './auth.service';
import { GroundworkEvents } from '../../common/events';

/**
 * A TEAM NAMED ON THE SIGN-UP FORM HAS ITS TRIAL BEFORE THE LINK ANSWERS (release check, 8 October 2026).
 *
 * Found on the test bed, copy a, as a new lead coming in by the anchor link: she named her organisation "Tamu Bakes",
 * opened the confirmation link, and read "You are signed in, but the check-in wasn't saved. Your organisation has no
 * plan yet." The page saves the check-in it was holding the moment the link answers; the month was given by a listener
 * of the sign-up event sent from inside the transaction, and landed 74 ms after the refusal. "Try again" then worked.
 *
 * So the link now waits for the trial rule, after the organisation exists, before it answers. Billing still decides
 * (the trial must be on, and the team really under its size): this only makes sure it has decided.
 */
const ORG = { id: 'o-tamu', name: 'Tamu Bakes', slug: 'tamu-bakes' };

function service(pending: any) {
  const order: string[] = [];
  const tx: any = {
    organization: { create: jest.fn(async ({ data }: any) => ({ ...ORG, ...data })), updateMany: jest.fn(async () => ({})) },
    user: { create: jest.fn(async ({ data }: any) => ({ id: 'u-amina', isActive: true, tokenEpoch: 0, organization: ORG, ...data })) },
    organizationMembership: { updateMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})), findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    entryDraft: { create: jest.fn(async () => ({})) },
    groundParticipant: { updateMany: jest.fn(async () => ({})) },
    pendingSignup: { delete: jest.fn(async () => ({})) },
  };
  const prisma: any = {
    pendingSignup: { findUnique: jest.fn(async () => pending), delete: jest.fn(async () => ({})) },
    user: { findUnique: jest.fn(async () => null) },
    person: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    organizationMembership: { count: jest.fn(async () => 0) },
    emailVerificationToken: { findUnique: jest.fn(async () => null), create: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => {
      const out = await fn(tx);
      order.push('the organisation exists');
      return out;
    }),
  };
  const sizeSaid: any[] = [];
  const events: any = {
    emit: jest.fn(),
    emitAsync: jest.fn(async (name: string, payload: any) => {
      if (name !== GroundworkEvents.ORG_SIZE_SAID) return [];
      sizeSaid.push(payload);
      await new Promise((r) => setTimeout(r, 20));
      order.push('the trial rule has run');
      return [];
    }),
  };
  const svc = new AuthService(
    prisma,
    { sign: () => 'a-session' } as any,
    { get: () => undefined } as any,
    { sendMagicLinkEmail: jest.fn() } as any,
    {} as any,
    {} as any,
    events,
  );
  return { svc, order, sizeSaid };
}

const waiting = {
  id: 'p1', email: 'amina@tamubakes.test', token: 'link', firstName: 'Amina', lastName: null,
  orgName: 'Tamu Bakes', passwordHash: null, payload: { scenario: 'HELP_TEAM_UNDERSTAND' }, history: [], draftToken: null,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

describe('a team named on the sign-up form has its trial before the link answers', () => {
  it('Amina names Tamu Bakes: the trial rule has run, after the organisation exists, before she is answered', async () => {
    const { svc, order, sizeSaid } = service(waiting);
    order.push('before');
    await svc.verifyEmail({ token: 'link' } as any);
    order.push('answered');
    expect(sizeSaid).toEqual([{ organizationId: 'o-tamu', said: 'fewer', line: 20 }]);
    expect(order).toEqual(['before', 'the organisation exists', 'the trial rule has run', 'answered']);
  });

  it('a team not named on the form is not given it here (its size is asked, or decided, elsewhere)', async () => {
    const { svc, sizeSaid } = service({ ...waiting, orgName: null });
    await svc.verifyEmail({ token: 'link' } as any);
    expect(sizeSaid).toEqual([]);
  });
});
