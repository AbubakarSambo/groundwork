import { PartyType } from '@prisma/client';
import { EntryService } from './entry.service';

/**
 * A SECOND COMMIT MUST NOT REPORT THAT NOBODY WAS INVITED.
 *
 * /entry/commit is idempotent by design: a consumed draft means a commit already
 * ran, so the second call finds the ground and returns it instead of creating
 * another. But it returned `contributors: []` flat, and MagicVerifyPage reads that
 * field to decide whether to render "Invited (N)":
 *
 *   const invitedEmails = (result.contributors ?? [])
 *     .map(c => c.email).filter(e => !result.failedInvites?.includes(e))
 *
 * So whenever the commit ran twice - a retried request, a remount, a double-submit
 * - the second call won the response, said no contributors and no failures, and the
 * person was told nothing about invites that had already gone out. The emails were
 * sent and the confirmation screen said they were not, which is worse than silence:
 * a leader who reads "no invites" chases people who already have a link.
 *
 * The empty list was never a fact. It was this path not looking.
 *
 * ESTABLISHED AS PRE-EXISTING, NOT INTRODUCED HERE: `git diff main...HEAD` shows no
 * change to the contributors path in either MagicVerifyPage.tsx or entry.service.ts,
 * so this is live on main.
 *
 * Held at the shape of the returned value, since that is the contract the page
 * consumes - and the participant rows are the only record of what the first call
 * did.
 */

/**
 * THE REAL METHOD, not a copy of it.
 *
 * The first version of this file re-implemented the read and asserted against its
 * own arithmetic, which proves the description and not the product - the exact
 * shape of mistake that has already sent three fixes in this codebase to nothing.
 * So it calls EntryService's own private path with a stubbed Prisma, and the
 * `select` it builds is captured from that call rather than restated here.
 */
let capturedSelect: Record<string, unknown> | undefined;

function callTheRealPath(participants: { email: string }[]) {
  const svc = Object.create(EntryService.prototype) as EntryService;
  (svc as unknown as { prisma: unknown }).prisma = {
    entryDraft: { findUnique: async () => ({ userId: 'u1', groundId: 'g1', consumedAt: new Date() }) },
    ground: {
      findUnique: async (args: { select: Record<string, unknown> }) => {
        capturedSelect = args.select;
        return { id: 'g1', joinToken: 'tok', participants };
      },
    },
  };
  return (svc as unknown as {
    awaitConsumedDraftGround(userId: string): Promise<{
      groundId: string; joinToken: string | null;
      contributors: { email: string }[]; failedInvites: string[];
    }>;
  }).awaitConsumedDraftGround('u1');
}

/** What the page does with it, copied from MagicVerifyPage so the two cannot drift. */
function whatThePageShows(result: { contributors: { email: string }[]; failedInvites: string[] }) {
  const invited = result.contributors.map((c) => c.email).filter((e) => !result.failedInvites.includes(e));
  return { showsInvitedBanner: invited.length > 0, invited };
}

describe('the second commit, when the first one already invited people', () => {
  const INVITED = [{ email: 'daisy@example-test.invalid' }];

  it('reports the people the first call invited', async () => {
    const out = await callTheRealPath(INVITED);
    expect(out.contributors).toEqual([{ email: 'daisy@example-test.invalid' }]);
    expect(out.groundId).toBe('g1');
  });

  it('so the page shows the confirmation instead of staying silent', async () => {
    // THE ASSERTION THAT MATTERS. Everything above is plumbing; this is the
    // sentence a person reads.
    const shown = whatThePageShows(await callTheRealPath(INVITED));
    expect(shown.showsInvitedBanner).toBe(true);
    expect(shown.invited).toEqual(['daisy@example-test.invalid']);
  });

  it('and the old behaviour would have shown nothing, which is what this catches', () => {
    // The bug, reconstructed. Without this the test above passes on any
    // implementation that happens to return a non-empty list.
    const oldBehaviour = { contributors: [] as { email: string }[], failedInvites: [] as string[] };
    expect(whatThePageShows(oldBehaviour).showsInvitedBanner).toBe(false);
  });

  it('claims no failed invites, because a failure belongs to the call that tried to send', async () => {
    // Deliberate. Guessing a failure here would invent one the person cannot act
    // on, and the send outcome is not recorded on the participant row.
    expect((await callTheRealPath(INVITED)).failedInvites).toEqual([]);
  });
});

describe('who counts as invited', () => {
  /**
   * Read off the `select` the service actually passed to Prisma, so the filter
   * cannot be quietly widened. What is held is the intent: an invite that was sent,
   * to somebody other than the person reading the page.
   */
  let where: { invitedAt?: unknown; partyType?: unknown };
  beforeAll(async () => {
    await callTheRealPath([]);
    where = (capturedSelect!.participants as { where: typeof where }).where;
  });

  it('only rows that were actually sent an invite', () => {
    expect(where.invitedAt).toEqual({ not: null });
  });

  it('and never the initiator, who is reading the page', () => {
    // grounds.create makes the initiator the first party with NO invitedAt, so the
    // date filter alone already excludes them. This is here so the count does not
    // silently start including them if that ever changes - the number on screen
    // should not depend on how another module happens to build a row.
    expect(where.partyType).toEqual({ not: PartyType.INITIATOR });
  });
});
