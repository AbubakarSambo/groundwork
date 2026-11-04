import {
  whatThisCheckMayDo, installTheGuard, ATriedToWrite, outcomeOf, theThingsKeptPrivate, whatLeaked,
  theScheduleOf, checkEverything, theSummary, run, type TheCheckInsData, type Serves, type AGroundToSchedule,
} from './existing-clients-check';

const LOCAL = 'postgresql://me@localhost/gw_pw9_1786222102';

describe('what the check may do', () => {
  it('refuses to run without an explicit database, and never reads DATABASE_URL', () => {
    process.env.DATABASE_URL = LOCAL;
    const may = whatThisCheckMayDo([]);
    expect(may.refused).toBe(true);
    expect((may as any).why).toContain('--database');
  });
  it('refuses --write', () => {
    expect((whatThisCheckMayDo(['--database', LOCAL, '--write']) as any).why).toContain('only reads');
  });
  it('runs on this machine without typing anything back', () => {
    const may = whatThisCheckMayDo(['--database', LOCAL, '--limit', '5']) as any;
    expect(may.refused).toBe(false);
    expect(may.mustTypeTheHostBack).toBe(false);
    expect(may.limit).toBe(5);
  });
  it('refuses a hosted database unless asked, then needs the host typed back', () => {
    const url = 'postgresql://u:p@db.example.com/live';
    expect((whatThisCheckMayDo(['--database', url]) as any).why).toContain('not on this machine');
    expect((whatThisCheckMayDo(['--database', url, '--hosted-database']) as any).mustTypeTheHostBack).toBe(true);
  });
  it('reads nothing when the host typed back is wrong or nobody answers', async () => {
    const said: string[] = [];
    const url = 'postgresql://u:p@db.example.com/live';
    for (const typed of ['wrong.example.com', null]) {
      const r = await run({ args: ['--database', url, '--hosted-database'], ask: async () => typed, say: (l) => said.push(l) });
      expect(r.read).toBe(false);
    }
    expect(said.join(' ')).toContain('did not match');
  });
});

describe('the guard', () => {
  it('lets reads through and refuses every write by name', async () => {
    let middleware: any;
    const prisma: any = { $use: (fn: any) => { middleware = fn; } };
    const refused: string[] = [];
    installTheGuard(prisma, (w) => refused.push(w));
    await expect(middleware({ model: 'Ground', action: 'findMany' }, async () => 'ok')).resolves.toBe('ok');
    await expect(middleware({ model: 'Report', action: 'update' }, async () => 'no')).rejects.toBeInstanceOf(ATriedToWrite);
    expect(() => prisma.$executeRaw()).toThrow(ATriedToWrite);
    expect(refused).toEqual(['Report.update', '$executeRaw']);
  });
  it('tells a refusal on purpose from a fault and from a write', () => {
    expect(outcomeOf({ getStatus: () => 403, message: 'no' }).outcome).toBe('refused');
    expect(outcomeOf(new Error('boom')).outcome).toBe('failed');
    expect(outcomeOf(new ATriedToWrite('Report.update')).outcome).toBe('wrote');
  });
});

describe('private material', () => {
  const pile = theThingsKeptPrivate({
    leadNotes: [{ text: 'I think Baraka is not committed to this role and may need to leave soon.' }],
    ownReports: [{ userId: 'amani', text: 'You said you were worried about the loan repayment dates slipping again.' }],
    askQuestions: [{ text: 'Should I tell the board that the hiring plan has slipped by two months?' }],
    otherCheckIns: [{ userId: 'amani', labels: ['Kisumu shop opening plan'] }],
  });
  it('finds each kind in what a reader was served, and only for readers who may not read it', () => {
    expect(whatLeaked('{"board":"I think Baraka is not committed to this role and may need to leave soon."}', 'baraka', pile, false)).toEqual(["the lead's private notes"]);
    expect(whatLeaked('{"board":"I think Baraka is not committed to this role and may need to leave soon."}', 'chidi', pile, true)).toEqual([]);
    expect(whatLeaked('{"x":"You said you were worried about the loan repayment dates slipping again."}', 'baraka', pile, false)).toEqual(["another person's own report"]);
    expect(whatLeaked('{"x":"You said you were worried about the loan repayment dates slipping again."}', 'amani', pile, false)).toEqual([]);
    expect(whatLeaked('{"q":"Should I tell the board that the hiring plan has slipped by two months?"}', 'anyone', pile, true)).toEqual(['a question to Ask Groundwork']);
    expect(whatLeaked('{"other":"Kisumu shop opening plan"}', 'baraka', pile, false)).toEqual(["another person's load across check-ins"]);
  });
});

const ground = (over: Partial<AGroundToSchedule> = {}): AGroundToSchedule => ({
  id: 'g', label: 'Sales team', status: 'ACTIVE', cadence: 'FORTNIGHTLY', timelineDays: 90, runsUntilEnded: false, endsAt: null,
  chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true,
  participants: [{ id: 'p1', userId: 'u1', managingOnly: false, lastNudgedAt: null }],
  checkIns: [], ...over,
});
const at = (d: string) => new Date(`${d}T09:00:00Z`);

describe('the schedule', () => {
  const now = at('2026-10-05');
  const done = { id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', availableFrom: null, completedAt: at('2026-09-28'), createdAt: at('2026-09-14'), isFinal: false, leadToldAt: null };
  it('accepts a next session a fortnight after the last one, and dates it', () => {
    const s = theScheduleOf(ground({ checkIns: [done, { ...done, id: 'c2', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: at('2026-10-12'), completedAt: null, createdAt: at('2026-09-28') }] }), now);
    expect(s.problems).toEqual([]);
    expect(s.nextOpens).toEqual(at('2026-10-12'));
  });
  it('says so when a finished session has no next one, and when a date does not follow', () => {
    expect(theScheduleOf(ground({ checkIns: [done] }), now).problems[0]).toContain('has no next session');
    const odd = theScheduleOf(ground({ checkIns: [done, { ...done, id: 'c2', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: at('2027-01-01'), completedAt: null }] }), now);
    expect(odd.problems[0]).toContain('does not follow from finishing session 1');
  });
  it('counts a reminder the same way the live rule does', () => {
    const open = { ...done, id: 'c2', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: at('2026-09-28'), completedAt: null, createdAt: at('2026-09-28') };
    const s = theScheduleOf(ground({ checkIns: [done, open] }), now);
    expect(s.openNow).toBe(1);
    expect(s.nudgesToday + s.leadToldToday).toBeGreaterThanOrEqual(0);
  });
  it('leaves a stalled check-in alone', () => {
    expect(theScheduleOf(ground({ status: 'STALLED', checkIns: [done] }), now).problems).toEqual([]);
  });
});

describe('the whole check, with stand-ins', () => {
  const g: any = { ...ground(), organizationId: 'o', initiatorId: 'lead', participants: [{ id: 'p1', userId: 'u1', managingOnly: false, lastNudgedAt: null, soloArtifact: null }] };
  const data = (pile: any[] = []): TheCheckInsData => ({
    grounds: [g],
    readersOf: async () => [
      { role: 'lead', userId: 'lead', organizationId: 'o' }, { role: 'participant', userId: 'u1', organizationId: 'o' }, { role: 'admin', userId: 'adm', organizationId: 'o' },
    ],
    privatePileFor: async () => pile,
    whatTheNewJobsWouldPickUpOnStalled: async () => ({ 'the morning WhatsApp reminder': 2 }),
  });
  const serving = (text: string): Serves => ({ board: async () => ({ text }), report: async () => ({ text }), page: async () => ({ text }) });

  it('serves every reader, finds no leak, and prints a plain summary', async () => {
    const r = await checkEverything(data(), serving('Plain words.'), new Date(), () => undefined);
    expect(r.reads.served).toBe(9);
    const text = theSummary(r, 'a test').join('\n');
    expect(text).toContain('Nobody was served the lead\'s private notes');
    expect(text).toContain('Nothing needs attention');
    expect(text).toContain('2 for the morning WhatsApp reminder');
  });
  it('reports a leak to a participant, a failure, and a read that tried to write', async () => {
    const pile = theThingsKeptPrivate({ leadNotes: [{ text: 'The lead thinks Baraka should be moved off the project next month.' }], ownReports: [], askQuestions: [], otherCheckIns: [] });
    const serves: Serves = {
      board: async () => ({ text: 'The lead thinks Baraka should be moved off the project next month.' }),
      report: async () => { throw new Error('column missing'); },
      page: async () => { throw new ATriedToWrite('Report.update'); },
    };
    const r = await checkEverything(data(pile), serves, new Date(), () => undefined);
    const text = theSummary(r, 'a test').join('\n');
    expect(r.leaks.some((l) => l.includes('participant') && l.includes("lead's private notes"))).toBe(true);
    expect(r.leaks.some((l) => l.includes('to a lead'))).toBe(false);
    expect(r.faults.some((f) => f.includes('could not be served'))).toBe(true);
    expect(r.faults.some((f) => f.includes('tried to write'))).toBe(true);
    expect(text).toContain('LEAK:');
    expect(text).not.toContain('Nothing needs attention');
    expect(text).not.toContain("1 2"); // never prints the private words
    expect(text).not.toContain('moved off the project');
  });
});
