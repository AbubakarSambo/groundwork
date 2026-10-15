import { GroundsService } from './grounds.service';

/**
 * A SHARED RECORD MUST NOT BE RELEASED WHILE SOMEBODY IS STILL ON THEIR WAY.
 *
 * Found live, on ground 2 of the eighteen. Six people were invited to the Atlas
 * ground. Three accepted and checked in within the hour. The other three had not
 * opened their email yet - and because the readiness count only recognised people
 * who had ACCEPTED, the round was declared complete at three of six.
 *
 * The record released, the ground went ACTIVE, and Eric received:
 *
 *     "Your shared record is ready: Atlas build, scope and ownership"
 *
 * He had not written a word. The record was built entirely from other people's
 * accounts of work he is part of, and session 1 had passed him by. That is the
 * exact failure this product exists to prevent, arriving by email with the
 * product's name on it.
 *
 * WHY TWO PARTIES COULD NEVER CATCH IT. With two people there is no third person
 * hovering between "invited" and "accepted" for long enough to matter: either the
 * other party has accepted or the round obviously is not ready. The bug needs a
 * ground where some people are quick and some are slow, which is every real
 * ground with more than two people in it.
 *
 * THE RULE NOW: a live invitation counts. It still does not wait forever - that
 * was the real point of the original clause, and it is kept - but the ground
 * waits exactly as long as the invitation is good for, and not a day longer.
 */

type Participant = {
  id: string;
  managingOnly: boolean;
  partyType?: string;
  userId: string | null;
  invitedAt: Date | null;
  inviteTokenExpiresAt: Date | null;
  completedSessions: number[];
};

/**
 * RELATIVE TO NOW, BECAUSE THE CODE UNDER TEST COMPARES AGAINST `Date.now()`.
 *
 * These were fixed dates, and `LIVE_INVITE` was '2026-08-20T12:00:00.000Z' with the comment
 * "ten days left". It was ten days left when it was written and it expired mid-morning on the
 * 20th - during a working session, between one green run of this suite and the next. The
 * assertion that flipped was "three of six is NOT a finished round", which is exactly the live
 * defect this file exists to pin: once the invitation lapsed, the round genuinely WAS ready and
 * the test was the only thing wrong.
 *
 * A test about whether an invitation is still open cannot hold its expiry as a literal date.
 * These are offsets now, so the fixture means the same thing on every day it runs.
 */
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(Date.now() - 10 * DAY);
const LIVE_INVITE = new Date(Date.now() + 10 * DAY);   // ten days left, always
const LAPSED_INVITE = new Date(Date.now() - 21 * DAY); // three weeks ago, always

/**
 * A Prisma stand-in that applies the service's own `where` clause to a fixed
 * cast of people, so the test exercises the REAL query shape rather than a
 * paraphrase of it. If the clause changes, this changes with it or fails.
 */
function prismaWith(people: Participant[]) {
  const matches = (p: Participant, where: any, sessionNumber: number): boolean => {
    if (where.managingOnly === false && p.managingOnly) return false;
    /* whoASessionCounts (decision 133): owes the session, or answered it. */
    for (const and of where.AND ?? []) {
      const ok = (and.OR as any[]).some((c) => (c.partyType ? (p.partyType ?? 'PARTICIPANT') === c.partyType && p.managingOnly === c.managingOnly : p.completedSessions.includes(sessionNumber)));
      if (!ok) return false;
    }
    return (where.OR as any[]).some((clause) => {
      if (clause.userId?.not === null) return p.userId !== null;
      if (clause.checkIns) return p.completedSessions.includes(sessionNumber);
      if (clause.userId === null) {
        return p.userId === null
          && p.invitedAt !== null
          && p.inviteTokenExpiresAt !== null
          && p.inviteTokenExpiresAt > clause.inviteTokenExpiresAt.gt;
      }
      return false;
    });
  };

  return {
    /* The situation: these are the ordinary kind, where a managing lead does give session one.
       See the-lead-who-only-asks for the one where they do not. */
    ground: { findUnique: async () => ({ scenario: 'GOAL_ALIGNMENT' }) },
    groundParticipant: {
      findMany: async ({ where }: any) => {
        const sessionNumber = where.OR.find((c: any) => c.checkIns)?.checkIns.some.sessionNumber;
        return people.filter((p) => matches(p, where, sessionNumber)).map((p) => ({ id: p.id }));
      },
    },
    checkIn: {
      findFirst: async ({ where }: any) => {
        const person = people.find((p) => p.id === where.participantId);
        /* The predicate reads the status now, because a decline is an answer too. */
        return person?.completedSessions.includes(where.sessionNumber) ? { id: 'ci', status: 'COMPLETED' } : null;
      },
    },
  };
}

const service = (people: Participant[]) =>
  new GroundsService(prismaWith(people) as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      // 7th dep: the model, for the context chat (G37/G23). Unused here.
      { respond: async () => '' } as any,
    );

const person = (id: string, over: Partial<Participant> = {}): Participant => ({
  id,
  managingOnly: false,
  userId: `u-${id}`,
  invitedAt: null,
  inviteTokenExpiresAt: null,
  completedSessions: [],
  ...over,
});

describe('the live failure, pinned', () => {
  it('three of six is NOT a finished round when the other three are still invited', async () => {
    // THE REGRESSION, with the exact cast from the Atlas ground.
    const atlas = [
      person('kennedy', { completedSessions: [1] }),
      person('ejiro', { completedSessions: [1] }),
      person('maureen', { completedSessions: [1] }),
      person('eric', { userId: null, invitedAt: NOW, inviteTokenExpiresAt: LIVE_INVITE }),
      person('hafeezah', { userId: null, invitedAt: NOW, inviteTokenExpiresAt: LIVE_INVITE }),
      person('abubakar', { userId: null, invitedAt: NOW, inviteTokenExpiresAt: LIVE_INVITE }),
    ];
    expect(await service(atlas).isSessionReadyForReport('g', 1)).toBe(false);
  });

  it('is finished once the last of the six has checked in', async () => {
    const allSix = ['kennedy', 'ejiro', 'maureen', 'eric', 'hafeezah', 'abubakar']
      .map((id) => person(id, { completedSessions: [1] }));
    expect(await service(allSix).isSessionReadyForReport('g', 1)).toBe(true);
  });
});

describe('it still does not wait forever', () => {
  it('a lapsed invitation drops out, so the rest are not held hostage', async () => {
    // The original clause existed for this, and it is kept. Somebody who was
    // invited three weeks ago and never came back cannot freeze the ground.
    const withANoShow = [
      person('kennedy', { completedSessions: [1] }),
      person('ejiro', { completedSessions: [1] }),
      person('ghost', { userId: null, invitedAt: LAPSED_INVITE, inviteTokenExpiresAt: LAPSED_INVITE }),
    ];
    expect(await service(withANoShow).isSessionReadyForReport('g', 1)).toBe(true);
  });

  /* CHANGED 11 OCTOBER (decision 133): session 1 used to wait for the managing-only lead. Every lead
     now checks in when they choose, so no session waits on them, and they count when they answered. */
  it('the lead checks in when they choose: no session waits for them', async () => {
    const leadNotYet = [
      person('lead', { managingOnly: true, partyType: 'INITIATOR' }),
      person('ejiro', { completedSessions: [1] }),
      person('maureen', { completedSessions: [1] }),
    ];
    expect(await service(leadNotYet).isSessionReadyForReport('g', 1)).toBe(true);
    const leadDone = [
      person('lead', { managingOnly: true, partyType: 'INITIATOR', completedSessions: [1] }),
      person('ejiro', { completedSessions: [1, 2] }),
      person('maureen', { completedSessions: [1, 2] }),
    ];
    expect(await service(leadDone).isSessionReadyForReport('g', 1)).toBe(true);
    /* From session 2 they have no check-in and are not a party to the comparison. */
    expect(await service(leadDone).isSessionReadyForReport('g', 2)).toBe(true);
  });
});

describe('the rest of the rules are untouched', () => {
  it('one person alone is never a shared record', async () => {
    expect(await service([person('solo', { completedSessions: [1] })]).isSessionReadyForReport('g', 1)).toBe(false);
  });

  it('accepted but not yet checked in still holds the round open', async () => {
    const oneStillWriting = [
      person('kennedy', { completedSessions: [1] }),
      person('ejiro', { completedSessions: [] }),
    ];
    expect(await service(oneStillWriting).isSessionReadyForReport('g', 1)).toBe(false);
  });

  it('session 2 is judged on session 2, not on session 1', async () => {
    const doneWithOne = [
      person('kennedy', { completedSessions: [1] }),
      person('ejiro', { completedSessions: [1] }),
    ];
    expect(await service(doneWithOne).isSessionReadyForReport('g', 2)).toBe(false);
  });
});
