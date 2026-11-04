import { atAGlance } from './what-a-manager-needs-at-a-glance';

/**
 * "When I come in as a manager, I want progress/status and blockers/risks."
 *
 * The card had neither: the brief, then the finding - one line, whichever read ranked highest that
 * round. What this holds is that both questions are answered the same way on every card, and that
 * the blocker count is the board's count rather than a second opinion about what a blocker is.
 */
const dep = (over: any = {}) => ({
  id: over.id ?? 'd1',
  what: 'the finance sign-off',
  status: 'BLOCKING',
  createdAt: new Date('2026-09-01'),
  fromParticipantId: 'p1',
  onParticipantId: null,
  onLabel: 'Amina',
  ...over,
});

const base = {
  roundsDone: 1,
  roundsPlanned: 3,
  /* Joined, which is what the population rule reads - see how-many-have-answered. */
  people: [{ id: 'p1', userId: 'u1' }, { id: 'p2', userId: 'u2' }, { id: 'lead', userId: 'u3', managingOnly: true }],
  sessionNumber: 2,
  thisRound: [{ participantId: 'p1', status: 'COMPLETED' }, { participantId: 'p2', status: 'NOT_STARTED' }],
  dependencies: [] as any[],
};

const NOW = new Date('2026-09-24');

describe('progress', () => {
  it('says how far through the run and how much of this round is in', () => {
    const g = atAGlance(base as any, NOW);
    /* U.5 review: it also says who is still waited on, so Today names the same people it counts. */
    expect(g.progress).toEqual({ roundsDone: 1, roundsPlanned: 3, answeredThisRound: 1, ofPeople: 2, waitingOn: ['p2'] });
  });

  it('does not count a managing-only lead among the people who answer', () => {
    /* They have no check-in by design, so counting them makes every round read one short for ever. */
    expect(atAGlance(base as any, NOW).progress.ofPeople).toBe(2);
  });

  /*
   * ONE DEFINITION, WHICH THIS DID NOT ASK. Read live on 22 September 2026: the board said "4 of 8
   * answered", the session report "7 of 8", the finding "2 of 5", the lead's page "0 of 5" - one
   * session. See how-many-have-answered.ts.
   */
  it('counts a decline as an answer, because it is one', () => {
    const g = atAGlance({ ...base, thisRound: [{ participantId: 'p1', status: 'COMPLETED' }, { participantId: 'p2', status: 'DECLINED' }] } as any, NOW);
    expect(g.progress).toEqual({ roundsDone: 1, roundsPlanned: 3, answeredThisRound: 2, ofPeople: 2, waitingOn: [] });
  });

  /* Changed 28 Sep 2026, Hafsah: the numbers people read count who is in the round by the check-in
     header's rule, so somebody whose invitation ran out is still one of the people. The round-closing
     rule still stops waiting on them: they are not in waitingOn. */
  /* CHANGED 1 NOVEMBER 2026: the one count counts everyone on the check-in, as the prototype does ("5 of 6 have checked in today; Omar
     hasn't yet", approved by Hafsah), so somebody whose invitation ran out is counted and named as not answered yet, on every page alike. */
  it('still counts somebody whose invitation ran out, and names them as not answered yet', () => {
    const people = [
      { id: 'p1', userId: 'u1' },
      { id: 'p2', invitedAt: new Date('2026-06-01'), inviteTokenExpiresAt: new Date('2026-09-01') },
    ];
    const g = atAGlance({ ...base, people, thisRound: [{ participantId: 'p1', status: 'COMPLETED' }] } as any, NOW);
    expect(g.progress.ofPeople).toBe(2);
    expect(g.progress.waitingOn).toEqual(['p2']);
    const live = [{ id: 'p1', userId: 'u1' }, { id: 'p2', invitedAt: new Date('2026-09-20'), inviteTokenExpiresAt: new Date('2026-12-20') }];
    expect(atAGlance({ ...base, people: live, thisRound: [{ participantId: 'p1', status: 'COMPLETED' }] } as any, NOW).progress.ofPeople).toBe(2);
  });

  it('and a run whose length nobody set says what is done rather than inventing a total', () => {
    expect(atAGlance({ ...base, roundsPlanned: null } as any, NOW).progress.roundsPlanned).toBeNull();
  });
});

describe('what is in the way', () => {
  it('counts a real blocker', () => {
    const g = atAGlance({ ...base, dependencies: [dep()] } as any, NOW);
    expect(g.inTheWay.count).toBe(1);
    expect(g.inTheWay.oldest).toBe('the finance sign-off');
    expect(g.inTheWay.daysWaiting).toBe(23);
  });

  it('counts what the BOARD counts, not what the table holds', () => {
    /*
     * THE ONE THAT MATTERS. Extraction writes a row whenever somebody sounds stuck, so one wait
     * becomes three rows and some name nothing at all. A list counting raw rows says five where the
     * board says one, and a person reading both believes neither.
     */
    const g = atAGlance({
      ...base,
      dependencies: [
        dep({ id: 'a', what: 'the finance sign-off' }),
        dep({ id: 'b', what: 'finance sign-off' }),          // the same thing said again
        dep({ id: 'c', what: 'a specific request', onLabel: 'Amina' }), // names nothing
      ],
    } as any, NOW);
    expect(g.inTheWay.count).toBe(1);
  });

  it('drops what has been cleared', () => {
    const g = atAGlance({ ...base, dependencies: [dep({ status: 'CLEARED' })] } as any, NOW);
    expect(g.inTheWay.count).toBe(0);
  });

  it('drops a claim with nothing in it, because being blocked protects somebody', () => {
    /* `blockerHasSubstance`: it names who, or it describes the thing in more than a couple of words. */
    const g = atAGlance({ ...base, dependencies: [dep({ what: 'stuck', onLabel: null, onParticipantId: null })] } as any, NOW);
    expect(g.inTheWay.count).toBe(0);
  });

  it('names the longest-standing one, because that is where waiting has cost most', () => {
    const g = atAGlance({
      ...base,
      dependencies: [
        dep({ id: 'new', what: 'the pricing page copy', createdAt: new Date('2026-09-20') }),
        dep({ id: 'old', what: 'the finance sign-off', createdAt: new Date('2026-09-02') }),
      ],
    } as any, NOW);
    expect(g.inTheWay.oldest).toBe('the finance sign-off');
  });

  it('and says nothing is in the way as a fact, not as an absence', () => {
    const g = atAGlance(base as any, NOW);
    expect(g.inTheWay).toEqual({ count: 0, oldest: null, daysWaiting: null, since: null, sinceSays: null });
  });
});
