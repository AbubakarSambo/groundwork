/**
 * ASKING FOR A LINK AGAIN MUST NOT DESTROY THE SESSION YOU ALREADY SAVED.
 *
 * entrySave holds the whole anonymous session in `pendingSignup` until the address is
 * proved, which is right (GW-001: nothing is created for an unverified stranger). But
 * the upsert's update branch wrote `payload: draft?.payload ?? {}` and
 * `history: draft?.history ?? []` unconditionally - so a call with NO draft replaced a
 * real stored session with an empty object and an empty array.
 *
 * There is a button that makes exactly that call: /auth's "Send link" runs
 * `authApi.entrySave(email)` with no draft.
 *
 * THE SEQUENCE, reproduced live before this was written:
 *   1. Finish the entry chat, type your email. Transcript stored, no account yet.
 *   2. Miss the confirmation. It renders 1678px down a 720px-tall panel and nothing
 *      scrolls to it, so the screen looks unchanged after you press save.
 *   3. Come back later, ask for a sign-in link with the same address. payload and
 *      history are blanked.
 *   4. Open the link: account created from an empty record. No ground, no transcript.
 *
 * Which is the report: "I sign in, my ground that I created via the entry chat was not
 * there." A silent loss of the entire session, at the one moment the product exists to
 * prevent loss.
 *
 * Held on the arguments handed to Prisma, because the bug was in the SHAPE of the
 * write - what it set on update - and that is the thing that must not regress.
 */

import { AuthService } from './auth.service';

type UpsertArgs = {
  where: { email: string };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

/** The real entrySave, with the writes captured. */
function runEntrySave(draft?: { payload?: Record<string, any>; history?: unknown[] }) {
  const calls: UpsertArgs[] = [];
  const svc = Object.create(AuthService.prototype) as AuthService;
  (svc as any).prisma = {
    user: { findUnique: async () => null },
    pendingSignup: { upsert: async (args: UpsertArgs) => { calls.push(args); return {}; } },
  };
  (svc as any).emailService = { sendMagicLinkEmail: async () => undefined };
  return (svc as any)
    .entrySave('hafsah@example-test.invalid', draft)
    .then(() => calls[0]);
}

const A_REAL_SESSION = {
  payload: { orgName: 'Coamana', report: { whatGroundworkSaw: 'five organizations' } },
  history: [{ role: 'user', text: 'We are working with Afrimash and four others' }],
};

describe('saving a session for the first time', () => {
  it('stores the whole thing, so the link can rebuild it', async () => {
    const args = await runEntrySave(A_REAL_SESSION);
    expect(args.create.payload).toEqual(A_REAL_SESSION.payload);
    expect(args.create.history).toEqual(A_REAL_SESSION.history);
    expect(args.create.orgName).toBe('Coamana');
  });
});

describe('asking for a link again, with no session attached', () => {
  it('does not touch the stored session', async () => {
    /**
     * THE ASSERTION THIS FILE EXISTS FOR. Before the fix, update carried
     * `payload: {}` and `history: []`, which is how a finished check-in disappeared.
     */
    const args = await runEntrySave(undefined);
    expect(args.update).not.toHaveProperty('payload');
    expect(args.update).not.toHaveProperty('history');
  });

  it('and does not throw away the name or the organisation either', async () => {
    // With no draft, firstName is re-derived from the email and the org name is
    // empty, so writing them unconditionally would replace what she typed with a
    // guess and a null.
    const args = await runEntrySave(undefined);
    expect(args.update).not.toHaveProperty('orgName');
    expect(args.update).not.toHaveProperty('firstName');
  });

  it('but still does what it says: a fresh token and a fresh expiry', async () => {
    // The point of the call is to reissue the link. That must keep working, or
    // somebody who lost their email can never get back in.
    const args = await runEntrySave(undefined);
    expect(typeof args.update.token).toBe('string');
    expect((args.update.token as string).length).toBeGreaterThan(20);
    expect(args.update.expiresAt).toBeInstanceOf(Date);
  });
});

describe('saving a second, real session', () => {
  it('replaces the stored one, because the newer account is the one they mean', async () => {
    // The other half: this must not become "never overwrite". Somebody who runs a
    // second entry session and saves it is telling us to use that one.
    const second = { payload: { orgName: 'Coamana Two' }, history: [{ role: 'user', text: 'a different situation' }] };
    const args = await runEntrySave(second);
    expect(args.update.payload).toEqual(second.payload);
    expect(args.update.history).toEqual(second.history);
    expect(args.update.orgName).toBe('Coamana Two');
  });
});
