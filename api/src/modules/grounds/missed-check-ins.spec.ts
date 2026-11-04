import {
  theirClosedSessions, whereTheyStand, whoHasMissedCheckIns, whatThePersonReads, whatTheLeadReads, theirReasonBesideIt, theNextStepSuggested,
  TOLD_THE_PERSON, TOLD_THE_LEAD, A_SUPPORT_PLAN, A_FORMAL_PROCESS,
} from './missed-check-ins';

const day = (n: number) => new Date(Date.UTC(2026, 8, 1 + n * 7));
const NOW = day(20);
/** A session the clock closed with nothing said. */
const missed = (n: number, extra: any = {}) => ({ id: `c${n}`, sessionNumber: n, status: 'COMPLETED', closedReason: 'auto_closed', turns: [], availableFrom: day(n), completedAt: day(n + 1), ...extra });
const answered = (n: number, extra: any = {}) => ({ id: `c${n}`, sessionNumber: n, status: 'COMPLETED', closedReason: null, turns: [{ id: 't' }], availableFrom: day(n), completedAt: day(n) , ...extra });
const stand = (rows: any[], leave: any[] = []) => whereTheyStand(theirClosedSessions(rows, leave, NOW));

describe('missed check-ins (decision 136)', () => {
  it('one miss is nothing; two in a row tells the person first', () => {
    expect(stand([answered(1), missed(2)]).stage).toBe(0);
    const s = stand([answered(1), missed(2), missed(3)]);
    expect(s.stage).toBe(TOLD_THE_PERSON);
    expect(s.inARow).toBe(2);
  });

  it('three of the last four tells the lead; four of five suggests a support plan; five of six a formal process', () => {
    expect(stand([answered(1), missed(2), answered(3), missed(4), missed(5)]).stage).toBe(TOLD_THE_LEAD);
    expect(stand([answered(1), missed(2), missed(3), missed(4), missed(5)]).stage).toBe(A_SUPPORT_PLAN);
    expect(stand([answered(1), missed(2), missed(3), missed(4), missed(5), missed(6)]).stage).toBe(A_FORMAL_PROCESS);
  });

  it('somebody who answered the latest is not chased', () => {
    expect(stand([missed(1), missed(2), missed(3), answered(4)]).stage).toBe(0);
  });

  it('a session still open is not missed, and one left waiting when the next opened is', () => {
    const open = { id: 'c3', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: day(3) };
    expect(stand([answered(1), missed(2), open]).stage).toBe(0);
    const expired = { id: 'c3', sessionNumber: 3, status: 'IN_PROGRESS', availableFrom: day(3) };
    const next = { id: 'c4', sessionNumber: 4, status: 'NOT_STARTED', availableFrom: day(4) };
    expect(stand([answered(1), missed(2), expired, next]).stage).toBe(TOLD_THE_PERSON);
  });

  it('approved leave never counts as missed', () => {
    const leave = [{ from: day(2), to: day(3) }];
    expect(stand([answered(1), missed(2), missed(3)], leave).stage).toBe(0);
  });

  it('an optional row and a set-up conversation are never counted', () => {
    expect(stand([answered(1), missed(2, { optional: true }), missed(3, { optional: true })]).stage).toBe(0);
    expect(stand([answered(1), missed(2, { isSetup: true }), missed(3)]).stage).toBe(0);
  });

  it('the lead and a managing-only row are never read, even with every session missed', async () => {
    const rows = [answered(1), missed(2), missed(3), missed(4), missed(5), missed(6)];
    const person = (id: string, partyType: string, managingOnly = false) => ({ id, groundId: 'g1', userId: `u-${id}`, partyType, managingOnly, nameGiven: null, user: { firstName: id === 'p1' ? 'Brian' : 'Lead', lastName: 'X' }, checkIns: rows });
    const prisma: any = {
      groundParticipant: { findMany: jest.fn().mockResolvedValue([person('lead', 'INITIATOR'), person('mo', 'PARTICIPANT', true), person('p1', 'PARTICIPANT')]) },
      leaveRequest: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const found = await whoHasMissedCheckIns(prisma, ['g1'], NOW);
    expect(found.map((f) => f.participantId)).toEqual(['p1']);
    expect(found[0].stand.stage).toBe(A_FORMAL_PROCESS);
  });

  it('the reason they gave in this run is kept for the lead', () => {
    expect(stand([answered(1), missed(2), missed(3, { missedReason: 'My mother was in hospital.' })]).reason).toBe('My mother was in hospital.');
  });
});

describe('what each reader reads', () => {
  it('the person, with somebody waiting on them and the lead named', () => {
    const text = whatThePersonReads({ inARow: 2 }, { leadName: 'Amani', somebodyWaitsOnThem: true });
    console.log(`THE PERSON READS:\n${text}`);
    /* Changed 18 October (Drop Access run 1, item 25): at two missed in a row the lead is not told yet (she is from three of the last four), so the person reads that she will be if they miss the next one, never that she will see this. */
    expect(text).toBe("You've missed your last two check-ins. Somebody on the team is waiting on you. If you miss the next one as well, Amani will be told. It takes about ten minutes.");
  });

  it('the person, with nobody waiting on them: no word about people waiting', () => {
    const text = whatThePersonReads({ inARow: 2 }, { leadName: null, somebodyWaitsOnThem: false });
    expect(text).not.toMatch(/waiting on you/);
    /* Changed 18 October (Drop Access run 1, item 25): at two missed in a row the lead is not told yet (she is from three of the last four), so the person reads that she will be if they miss the next one, never that she will see this. */
    expect(text).toContain('If you miss the next one as well, your manager will be told.');
  });

  it('the lead: facts and what they do, the name and never a guessed pronoun or a label', () => {
    const text = whatTheLeadReads('Brian', { ofTheLastFour: 3, lastFour: 4 }, 'Sales weekly');
    console.log(`THE LEAD READS:\n${text}\n${theirReasonBesideIt('Brian', 'My mother was in hospital.')}\n${theNextStepSuggested('Brian', A_SUPPORT_PLAN)}`);
    expect(text).toBe('Brian has missed 3 of the last 4 check-ins on "Sales weekly". Speak to Brian this week.');
    expect(text).not.toMatch(/\b(him|her|his|she|he)\b|at risk|PIP|exit/);
    expect(theNextStepSuggested('Brian', TOLD_THE_LEAD)).toBeNull();
    expect(theNextStepSuggested('Brian', A_FORMAL_PROCESS)).toContain('a formal process in the performance suite');
  });
});
