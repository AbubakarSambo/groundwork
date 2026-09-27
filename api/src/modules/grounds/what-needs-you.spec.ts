import { whatNeedsYou, type ListedCheckIn } from './what-needs-you';

/**
 * WHAT EACH READER IS TOLD ON TODAY (C1, U.5), in the words they read.
 *
 * One set of check-ins, read as the lead who runs the sales team, as Miriam who takes part in it, and
 * as an admin of the organisation. Each is told only what they may act on, and a participant is
 * never told who else has not checked in.
 */

const NOW = new Date('2026-09-23T09:00:00Z');
const H = 3_600_000;
const ago = (hours: number) => new Date(NOW.getTime() - hours * H).toISOString();
const ahead = (hours: number) => new Date(NOW.getTime() + hours * H).toISOString();

const WAIRIMU = 'u-wairimu';
const MIRIAM = 'u-miriam';
const AMANI = 'u-amani';
const GRACE = 'u-grace';

const person = (id: string, userId: string, firstName: string) => ({ id, userId, user: { firstName } });

const sales: ListedCheckIn = {
  id: 'g-sales', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: 'org', initiatorId: WAIRIMU,
  participants: [person('p-w', WAIRIMU, 'Wairimu'), person('p-m', MIRIAM, 'Miriam'), person('p-o', 'u-omar', 'Omar'), person('p-b', 'u-brian', 'Brian')],
  checkIns: [
    { id: 'c1', participantId: 'p-m', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(48), completedAt: ago(40) },
    { id: 'c2', participantId: 'p-o', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(48), completedAt: ago(40) },
    { id: 'c3', participantId: 'p-b', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(48), completedAt: ago(40) },
    { id: 'c4', participantId: 'p-m', sessionNumber: 2, status: 'COMPLETED', availableFrom: ago(5), completedAt: ago(2) },
    { id: 'c5', participantId: 'p-o', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(5) },
    { id: 'c6', participantId: 'p-b', sessionNumber: 2, status: 'COMPLETED', availableFrom: ago(5), completedAt: ago(3) },
    { id: 'c7', participantId: 'p-m', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: ahead(31) },
    { id: 'c8', participantId: 'p-o', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: ahead(31) },
    { id: 'c9', participantId: 'p-b', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: ahead(31) },
  ],
  reportWaitingForMe: false,
  glance: { progress: { roundsDone: 1, roundsPlanned: 12 } },
};

const leadership: ListedCheckIn = {
  id: 'g-lead', label: 'Leadership, Q3', status: 'ACTIVE', organizationId: 'org', initiatorId: AMANI,
  participants: [person('p-a', AMANI, 'Amani'), person('p-w2', WAIRIMU, 'Wairimu')],
  checkIns: [{ id: 'l2', participantId: 'p-w2', sessionNumber: 4, status: 'NOT_STARTED', availableFrom: ago(2) }],
  glance: { progress: { roundsDone: 3, roundsPlanned: 12 } },
};

const faith: ListedCheckIn = {
  id: 'g-faith', label: 'Faith, first 90 days', status: 'ACTIVE', organizationId: 'org', initiatorId: WAIRIMU,
  participants: [person('p-w3', WAIRIMU, 'Wairimu'), person('p-f', 'u-faith', 'Faith')],
  checkIns: [
    { id: 'f1', participantId: 'p-w3', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: ago(1) },
    { id: 'f2', participantId: 'p-f', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: ago(1) },
  ],
  glance: { progress: { roundsDone: 0, roundsPlanned: 12 } },
};

const kwame: ListedCheckIn = {
  id: 'g-kwame', label: 'Kwame, first 90 days', status: 'ACTIVE', organizationId: 'org', initiatorId: WAIRIMU,
  participants: [person('p-w4', WAIRIMU, 'Wairimu'), person('p-k', 'u-kwame', 'Kwame')],
  checkIns: [{ id: 'k12', participantId: 'p-k', sessionNumber: 12, status: 'COMPLETED', availableFrom: ago(80), completedAt: ago(70) }],
  glance: { progress: { roundsDone: 12, roundsPlanned: 12 } },
};

/* Miriam's list: the check-in she takes part in, with a report released to her. */
const salesAsMiriam: ListedCheckIn = { ...sales, reportWaitingForMe: true, latestSummary: 'Three deals moved stage. Kito Foods has had no contact for four days.' };

const titles = (r: ReturnType<typeof whatNeedsYou>) => r.needs.map((n) => n.title);

describe('Today, as the lead who runs the sales team', () => {
  const r = whatNeedsYou([sales, leadership, faith, kwame], { userId: WAIRIMU, role: 'MEMBER', organizationId: 'org' }, [], NOW);

  it('lists what needs her, most important first, in full sentences', () => {
    expect(titles(r)).toEqual([
      'Your first check-in for Faith, first 90 days',
      'Decide how Kwame, first 90 days ends',
      'Your own check-in for Leadership, Q3',
    ]);
    expect(r.needs.map((n) => [n.detail, n.action.label, n.action.to])).toEqual([
      ['About two minutes. Everyone else’s answers are read against yours.', 'Start it', '/checkin/f1'],
      ['The last session is done.', 'Decide', '/grounds/g-kwame'],
      ['About two minutes.', 'Start it', '/checkin/l2'],
    ]);
    expect(r.count).toBe(3);
  });

  it('tells her who has checked in to the check-in she runs, by name', () => {
    expect(r.line).toBe('In Sales team, Q3, 2 of 3 have checked in for session 2; Omar hasn’t yet.');
  });

  it('says what is coming up, as moments the screen puts in her own time', () => {
    expect(r.comingUp).toEqual([{ at: ahead(31), what: 'Sales team, Q3, session 3 opens', to: '/grounds/g-sales' }]);
  });
});

describe('Today, as Miriam, who takes part in the sales team', () => {
  const r = whatNeedsYou([salesAsMiriam], { userId: MIRIAM, role: 'MEMBER', organizationId: 'org' }, [{ id: 'g-x', label: 'Supplier review', createdBy: 'Omar Ali' }], NOW);

  it('tells her about her report and her own report, and nothing that is not hers', () => {
    expect(titles(r)).toEqual(['The report for Sales team, Q3 is ready', 'Your own report for Sales team, Q3']);
    expect(r.needs[0].detail).toBe('Three deals moved stage.');
    expect(r.needs[1]).toMatchObject({ detail: 'Only you see it.', action: { label: 'Read it', to: '/checkin/c4/report' } });
  });

  it('never tells a participant who else has not checked in', () => {
    expect(r.line).toBeNull();
    expect(JSON.stringify(r)).not.toContain('Omar');
  });

  it('is never given the approvals queue, even if one is passed in', () => {
    expect(titles(r).some((t) => t.includes('approve'))).toBe(false);
  });

  it('says her own check-in is open when it is her turn', () => {
    const open = { ...sales, checkIns: [...sales.checkIns!, { id: 'c10', participantId: 'p-m', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(9 * 24) }] };
    open.checkIns = open.checkIns.filter((c) => c.id !== 'c4');
    const mine = whatNeedsYou([open], { userId: MIRIAM, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(mine.line).toBe('Your check-in for Sales team, Q3 is open.');
    expect(mine.needs[0]).toMatchObject({ title: 'Your own check-in for Sales team, Q3', detail: 'About two minutes. It opened 9 days ago.' });
  });
});

describe('Today, as an admin of the organisation', () => {
  const r = whatNeedsYou([sales, leadership], { userId: GRACE, role: 'ADMIN', organizationId: 'org' }, [{ id: 'g-x', label: 'Supplier review', createdBy: 'Omar Ali' }], NOW);

  it('is asked to approve what is waiting, and is not told to decide how someone else’s check-in ends', () => {
    expect(r.needs).toEqual([
      expect.objectContaining({
        title: 'Supplier review is waiting for you to approve it',
        detail: 'Omar Ali set it up. Nothing goes out until you approve it.',
        action: { label: 'Look at it', to: '/grounds/g-x' },
      }),
    ]);
  });

  it('sees who has checked in, as the check-in’s own page shows an admin', () => {
    expect(r.line).toBe('In Sales team, Q3, 2 of 3 have checked in for session 2; Omar hasn’t yet.');
  });
});

describe('the second line on a turn of your own (U.5 review, today-lead.txt)', () => {
  it('a participant\'s first check-in is "About two minutes." only, since nobody is read against theirs', () => {
    const first = { ...sales, checkIns: [{ id: 'm1', participantId: 'p-m', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: ago(1) }] };
    const r = whatNeedsYou([first], { userId: MIRIAM, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.needs[0]).toMatchObject({ title: 'Your first check-in for Sales team, Q3', detail: 'About two minutes.' });
  });
});

describe('one count for one session (U.5 review)', () => {
  it('uses the check-in\'s own count, the one the list row shows, and names the same people', () => {
    /* Three rows, but Brian has not joined, so the check-in waits on two people: "1 of 2 answered". */
    const g = { ...sales, glance: { progress: { roundsDone: 1, roundsPlanned: 12, answeredThisRound: 1, ofPeople: 2, waitingOn: ['p-o'] } } };
    const r = whatNeedsYou([g], { userId: WAIRIMU, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line).toBe('In Sales team, Q3, 1 of 2 have checked in for session 2; Omar hasn’t yet.');
  });
});

describe('small cases in the sentence about who has checked in', () => {
  const reader = { userId: WAIRIMU, role: 'MEMBER', organizationId: 'org' };
  it('says nobody, when nobody has', () => {
    const none = { ...sales, checkIns: sales.checkIns!.filter((c) => c.sessionNumber === 2).map((c) => ({ ...c, status: 'NOT_STARTED' })) };
    expect(whatNeedsYou([none], reader, [], NOW).line).toBe('In Sales team, Q3, nobody has checked in for session 2 yet.');
  });
  it('counts people rather than listing three names', () => {
    const three = { ...sales, checkIns: sales.checkIns!.filter((c) => c.sessionNumber === 2).map((c) => ({ ...c, status: c.id === 'c4' ? 'COMPLETED' : 'NOT_STARTED' })) };
    three.checkIns.push({ id: 'cw', participantId: 'p-w', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(5) });
    expect(whatNeedsYou([three], reader, [], NOW).line).toBe('In Sales team, Q3, 1 of 4 have checked in for session 2; 3 people haven’t yet.');
  });
  it('says "you" rather than the reader’s own name', () => {
    const withMe = { ...sales, checkIns: sales.checkIns!.filter((c) => c.sessionNumber === 2 && c.id !== 'c5') };
    withMe.checkIns.push({ id: 'cw', participantId: 'p-w', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(5) });
    expect(whatNeedsYou([withMe], reader, [], NOW).line).toBe('In Sales team, Q3, 2 of 3 have checked in for session 2; you haven’t yet.');
  });
  it('says nothing about a check-in that has ended', () => {
    expect(whatNeedsYou([{ ...sales, status: 'CLOSED' }], reader, [], NOW)).toMatchObject({ needs: [], line: null, comingUp: [] });
  });
});
