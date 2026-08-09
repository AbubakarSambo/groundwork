import { ParticipantsService } from './participants.service';

/**
 * GW-INVITE-SINGLE-USE tripwire.
 *
 * An invite link used to mint a fresh access token EVERY time it was presented,
 * and the token was never cleared from the row. That made the emailed link a
 * permanent bearer credential: anyone who ever saw it - a forwarded email, a
 * screenshot, a shared inbox, an old archive - could sign in as that person and
 * read their private account, indefinitely.
 *
 * Found by replaying a used invite token against the live API, which returned a
 * valid accessToken for a participant who had accepted hours earlier.
 *
 * THE RULE IS UNCHANGED. A presented invite link must never, on its own, mint a
 * session for a participant who has already joined. That is the whole point and
 * it is asserted below exactly as before.
 *
 * WHAT CHANGED IS THE MECHANISM, and why. The first fix destroyed the token on
 * accept, which made the link dead for its owner too: someone who joined, got
 * pulled into something else, and came back to their own email was told their
 * link was "invalid". That is a bad trade in a product people use mid-working-day.
 *
 * So the token now survives and stops being a credential instead:
 *
 *   never joined          -> join, account created, signed in
 *   joined, this browser  -> resumes, because the request carries the session
 *                            they were given when they joined
 *   joined, anywhere else -> NO session. A fresh sign-in link is emailed to the
 *                            address that was invited.
 *
 * A forwarded link is still worth nothing to whoever received it - they have no
 * session for that participant - and its owner is no longer locked out of their
 * own record. The security property and the annoyance were never the same thing.
 */
function makeService(participant: any) {
  const update = jest.fn(async (a: any) => a);
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => participant), findFirst: jest.fn(async () => participant), update },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', organizationId: 'org1' })) },
    user: { findUnique: jest.fn(async () => null), create: jest.fn(async () => ({ id: 'u1', email: participant.email, firstName: 'A', lastName: 'B', role: 'MEMBER', organizationId: 'org1', passwordHash: 'x' })) },
    checkIn: { findFirst: jest.fn(async () => ({ id: 'ci1' })) },
    emailVerificationToken: { create: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const svc = new ParticipantsService(
    prisma,
    { sign: () => 'jwt' } as any,
    { sendAddPasswordEmail: async () => undefined, sendMagicLinkEmail: async () => undefined } as any,
  );
  return { svc, prisma, update };
}

const accepted = { id: 'p1', groundId: 'g1', email: 'k@x.test', userId: 'already-here', inviteToken: 'tok' };

describe('GW-INVITE-SINGLE-USE: an invite link cannot sign you in twice', () => {
  it('mints no session for an accepted invite presented by nobody in particular (tripwire)', async () => {
    // THE SECURITY PROPERTY, unchanged: a forwarded link, a screenshot, an old
    // archive - none of them carry the participant's session, so none of them
    // get in.
    const { svc } = makeService({ ...accepted });
    const res: any = await svc.accept('tok');
    expect(res.accessToken).toBeUndefined();
    expect(res.emailed).toBe(true);
  });

  it('mints no session for someone else who is signed in', async () => {
    // A colleague with their own perfectly valid session is still not this
    // participant, and holding the link changes nothing.
    const { svc } = makeService({ ...accepted });
    const res: any = await svc.accept('tok', undefined, 'a-different-user');
    expect(res.accessToken).toBeUndefined();
    expect(res.emailed).toBe(true);
  });

  it('sends a way back in rather than a refusal', async () => {
    // The old version threw. Nobody should hit a dead end on their own record -
    // the link goes to the address that was invited, so only its owner can use it.
    const { svc, prisma } = makeService({ ...accepted });
    // The participant's account exists - that is what "already accepted" means.
    prisma.user.findUnique = jest.fn(async () => ({ id: 'already-here', email: 'k@x.test', firstName: 'K' }));
    const res: any = await svc.accept('tok');
    expect(res.email).toBe('k@x.test');
    expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
  });

  it('resumes for the participant who is already signed in on this browser', async () => {
    // The whole reason for the change: click, get distracted, come back.
    const { svc } = makeService({ ...accepted });
    const res: any = await svc.accept('tok', undefined, 'already-here');
    expect(res.resumed).toBe(true);
    expect(res.checkInId).toBe('ci1');
    expect(res.accessToken).toBeUndefined();   // they already have one
  });

  it('keeps the token so the owner\'s own link goes on working', async () => {
    // Was: cleared on accept, which killed the link for its owner too.
    const { svc, update } = makeService({ id: 'p1', groundId: 'g1', email: 'k@x.test', userId: null, inviteToken: 'tok' });
    await svc.accept('tok', { firstName: 'K', lastName: 'B' });
    const data = update.mock.calls.map((c: any) => c[0]?.data).find((d: any) => d && 'userId' in d);
    expect(data.inviteToken).toBeUndefined();
  });

  it('still signs in a first-time joiner', async () => {
    const { svc } = makeService({ id: 'p1', groundId: 'g1', email: 'k@x.test', userId: null, inviteToken: 'tok' });
    const res: any = await svc.accept('tok', { firstName: 'K', lastName: 'B' });
    expect(res.accessToken).toBe('jwt');
  });
});
