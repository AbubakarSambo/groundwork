import { theBoardAtAGlance } from './the-board-at-a-glance';

/**
 * THE BOARD AT A GLANCE (docs/light-rebuild/sales-first.md, rules 3 and 4). The one-line facts on
 * the sales board's folded lines and boxes are read here from the board the reader is served, and
 * say only what that board holds. Checked against a board shaped like the Baridi example.
 */
const BOARD = {
  workRecords: [
    { section: 'Deal grid', state: 'filled', rows: [{ name: 'Eastside Foods' }, { name: 'Westgate Deli' }, { name: 'Green Mart' }] },
    { section: 'Forecast', state: 'not-known', rows: [] },
  ],
  objectives: [
    { id: 'a', name: 'The team is aiming for 25 freezers sold.', target: 25, count: 21, journey: { now: 21 }, stands: { word: 'On time' }, ownerParticipantId: null, assumes: ['6 reps each close about 4 sales.', 'Supermarkets buy before December.', 'Stock arrives within a week.'] },
    { id: 'b', name: 'The team is aiming to keep quotes followed up within 48 hours at 90% or more.', target: 90, count: 84, ownerParticipantId: null, assumes: [], assumesSays: 'Nothing on record says what this target assumes yet.' },
    { id: 'c', name: 'Freezers sold', target: 5, count: 4, ownerParticipantId: 'miriam', assumes: [] },
  ],
  reportedAgainstCriteria: { stages: [{ stage: 'Quoted', reported: 3, withProof: 2 }, { stage: 'Won', reported: 1, withProof: 1 }] },
  coaching: { yours: { whyItMatters: 'x' }, eachPerson: [{ who: 'A' }, { who: 'B' }, { who: 'C' }, { who: 'D' }, { who: 'E' }] },
  eachPerson: [{ reason: 'waiting on someone' }, { reason: 'waiting on someone' }, { reason: 'has not answered' }],
  patterns: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
  howItIsGoing: { glance: { progress: { answeredThisRound: 5, ofPeople: 6 } } },
  workPlan: [{ state: 'open' }, { state: 'open' }, { state: 'not done' }, { state: 'done' }],
  blockers: [
    { name: 'Credit terms for Westgate Deli', state: 'waiting', raised: { times: 1 } },
    { name: 'Price objections', state: 'blocking', raised: { times: 9 } },
    { name: 'Stock of 600 litre freezers', state: 'blocking', raised: { times: 4 } },
  ],
  risks: [{ id: 1 }, { id: 2 }],
  dependencies: [
    { on: 'Operations', onParticipantId: null, status: 'BLOCKING' },
    { on: 'Finance', onParticipantId: null, status: 'WAITING' },
    { on: 'You', onParticipantId: 'wairimu', status: 'WAITING' },
    { on: 'Finance', onParticipantId: null, status: 'CLEARED' },
  ],
  divergence: { items: [{ topic: 'Mama Fresh' }] },
  decisions: [{ question: 'Does a price range count as a budget?' }, { question: 'Who will ask the customers?' }],
  leadActions: [{ says: 'You need to get back to Brian Ochieng.' }],
  phaseSpine: { sessions: [{ state: 'done' }, { state: 'done' }, { state: 'open' }] },
};

describe('the board at a glance: facts from the board as served', () => {
  const g = theBoardAtAGlance(BOARD, { readerCheckedInThisRound: false });

  it('says each line the way the light prototype does, from the rows the reader is served', () => {
    expect(g.lines.deals).toBe('3 deals, each with what shows it');
    expect(g.lines.targetAssumes).toBe('3 assumptions behind the target');
    expect(g.lines.reported).toBe('Won: 1 said, 1 with proof');
    expect(g.lines.targetsOverTime).toBe('21 of 25, on time; 84 of 90');
    expect(g.lines.whatToAsk).toBe('Something worth recognising, and what’s in the way, for each of 5 people');
    /* A sentence, never the reasons' own keys (release test, 21 November 2026: "3 has not answered; 2 nothing to do"). */
    expect(g.lines.teamToday).toBe('2 people are waiting on someone, and 1 person has not checked in yet.');
    expect(g.lines.patterns).toBe('4 patterns about how the work is going');
    expect(g.lines.whoCheckedIn).toBe('Today: 5 of 6 checked in');
    expect(g.lines.yourNextStep).toBe('Only you. You haven’t checked in this check-in');
    expect(g.lines.workPlan).toBe('2 open, 1 done, 1 not done');
    expect(g.lines.blockers).toBe('2 blocking. The biggest: Price objections, raised 9 times');
    expect(g.lines.waitingOnOtherTeams).toBe('2: Operations, Finance');
    expect(g.lines.openIssues).toBe('1 thing people see differently, 2 decisions needed');
    expect(g.lines.reports).toBe('2 check-ins so far, each with its reports');
  });

  it('gives each box its two most useful facts', () => {
    expect(g.boxes.work).toEqual(['3 deals, each with what shows it', '3 assumptions behind the target']);
    expect(g.boxes.risk).toEqual(['2 blocking. The biggest: Price objections, raised 9 times', '2 things that could stop the goal']);
  });

  it('tells an admin what is waiting on the lead, in one line', () => {
    expect(g.needsTheLead).toBe('3 things: You need to get back to Brian Ochieng. · Does a price range count as a budget? · and more');
  });

  it('says nothing it cannot read from the board: an empty board has no facts, and a person’s own share is never a team target', () => {
    const empty = theBoardAtAGlance({}, { readerCheckedInThisRound: null });
    expect(empty.lines).toEqual({});
    expect(empty.needsTheLead).toBeNull();
    expect(Object.values(empty.boxes).every((f) => f.length === 0)).toBe(true);
    expect(g.lines.targetsOverTime).not.toContain('of 5');
  });

  it('says "raised once", not "raised 1 times"', () => {
    const one = theBoardAtAGlance({ blockers: [{ name: 'Stock', state: 'blocking', raised: { times: 1 } }] }, { readerCheckedInThisRound: true });
    expect(one.lines.blockers).toBe('1 blocking. The biggest: Stock, raised once');
  });

  it('gives each target its own fact for "What the target of … assumes", from what is written down', () => {
    expect(g.assumesEach).toEqual({ a: '3 assumptions behind the target', b: 'Nothing on record says what this target assumes yet' });
  });

  it('does not count decisions under "Open issues" for the lead, who reads them under "What needs you"', () => {
    const lead = theBoardAtAGlance(BOARD, { readerCheckedInThisRound: false, readerIsTheLead: true });
    expect(lead.lines.openIssues).toBe('1 thing people see differently');
    expect(g.lines.openIssues).toBe('1 thing people see differently, 2 decisions needed');
  });

  it('says plainly what the record cannot fill yet, and counts whose work is landing with others without naming anybody', () => {
    const g2 = theBoardAtAGlance({
      workRecords: [{ section: 'Forecast', state: 'not-known', rows: [] }],
      byArea: { state: 'not-known', why: 'x' },
      coverage: { reads: [{ name: 'Miriam', kind: 'STABLE' }, { name: 'Brian', kind: 'STABLE' }] },
    }, { readerCheckedInThisRound: null });
    expect(g2.lines.likelyEnd).toBe('Groundwork does not keep this yet');
    expect(g2.lines.byArea).toBe('Nothing on record says where each piece of work belongs yet');
    expect(g2.lines.landing).toBe('Nothing is leaking out or piling in');
    const g3 = theBoardAtAGlance({ coverage: { reads: [{ name: 'Miriam', kind: 'LEAKING' }, { name: 'Brian', kind: 'ABSORBING' }] } }, { readerCheckedInThisRound: null });
    expect(g3.lines.landing).toBe('1 person whose work is landing with others, 1 person taking on others’ work');
    expect(g3.lines.landing).not.toMatch(/Miriam|Brian/);
  });
  it('reads the furthest stage reached, never Lost (Grace read "Lost: 4 said, 0 with proof", 18 October)', () => {
    const g = theBoardAtAGlance({ reportedAgainstCriteria: { stages: [{ stage: 'Won', reported: 5, met: 4 }, { stage: 'Lost', reported: 4 }] } } as any, { readerCheckedInThisRound: null });
    expect(g.lines.reported).toBe('Won: 5 said, 4 met');
  });
});
