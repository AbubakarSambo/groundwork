import { peopleSaidDifferentThingsAbout } from '../reports/what-people-said-differently-about';
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
      'Your next check-in for Leadership, Q3',
    ]);
    expect(r.needs.map((n) => [n.detail, n.action.label, n.action.to])).toEqual([
      ['About ten minutes.', 'Start it', '/checkin/f1'],
      ['The last check-in is done.', 'Decide', '/grounds/g-kwame'],
      ['About ten minutes.', 'Start it', '/checkin/l2'],
    ]);
    expect(r.count).toBe(3);
  });

  it('names the check-in a coming-up row is about, with the day it started, so two close names are told apart by the thing (request 193)', () => {
    const two = whatNeedsYou([{ ...sales, createdAt: new Date('2026-09-01T08:00:00Z') } as ListedCheckIn], { userId: WAIRIMU, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(two.comingUp[0]).toMatchObject({ groundId: 'g-sales', checkInStartedOn: '2026-09-01T08:00:00.000Z' });
  });

  it('tells her who has checked in to the check-in she runs, by name', () => {
    expect(r.line).toBe('In Sales team, Q3, 2 of 3 have checked in for the second check-in. Omar has not checked in yet.');
  });

  it('says what is coming up, as moments the screen puts in her own time', () => {
    expect(r.comingUp).toEqual([{ at: ahead(31), what: 'The third check-in for “Sales team, Q3” opens.', to: '/grounds/g-sales', groundId: 'g-sales' }]);
  });
});

describe('Today, as Miriam, who takes part in the sales team', () => {
  const r = whatNeedsYou([salesAsMiriam], { userId: MIRIAM, role: 'MEMBER', organizationId: 'org' }, [{ id: 'g-x', label: 'Supplier review', createdBy: 'Omar Ali' }], NOW);

  it('tells her about her report and her own report, and nothing that is not hers', () => {
    expect(titles(r)).toEqual(['The report for Sales team, Q3 is ready', 'Your own report for Sales team, Q3 is ready']);
    expect(r.needs[0].detail).toBe('Three deals moved stage.');
    expect(r.needs[1]).toMatchObject({ detail: null, action: { label: 'Read it', to: '/checkin/c4/report' } });
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
    expect(mine.needs[0]).toMatchObject({ title: 'Your next check-in for Sales team, Q3', detail: 'About ten minutes. It opened on 14 September.' });
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
    expect(r.line).toBe('In Sales team, Q3, 2 of 3 have checked in for the second check-in. Omar has not checked in yet.');
  });
});

describe('the second line on a turn of your own (U.5 review, today-lead.txt)', () => {
  it('a participant\'s first check-in is "About ten minutes." only, since nobody is read against theirs', () => {
    const first = { ...sales, checkIns: [{ id: 'm1', participantId: 'p-m', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: ago(1) }] };
    const r = whatNeedsYou([first], { userId: MIRIAM, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.needs[0]).toMatchObject({ title: 'Your first check-in for Sales team, Q3', detail: 'About ten minutes.' });
  });
});

describe('one count for one session (U.5 review)', () => {
  it('uses the check-in\'s own count, the one the list row shows, and names the same people', () => {
    /* Three rows, but Brian has not joined, so the check-in waits on two people: "1 of 2 answered". */
    const g = { ...sales, glance: { progress: { roundsDone: 1, roundsPlanned: 12, answeredThisRound: 1, ofPeople: 2, waitingOn: ['p-o'] } } };
    const r = whatNeedsYou([g], { userId: WAIRIMU, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line).toBe('In Sales team, Q3, 1 of 2 have checked in for the second check-in. Omar has not checked in yet.');
  });
});

describe('small cases in the sentence about who has checked in', () => {
  const reader = { userId: WAIRIMU, role: 'MEMBER', organizationId: 'org' };
  it('says nobody, when nobody has', () => {
    const none = { ...sales, checkIns: sales.checkIns!.filter((c) => c.sessionNumber === 2).map((c) => ({ ...c, status: 'NOT_STARTED' })) };
    expect(whatNeedsYou([none], reader, [], NOW).line).toBe('In Sales team, Q3, nobody has checked in for the second check-in yet.');
  });
  it('counts people rather than listing three names', () => {
    const three = { ...sales, checkIns: sales.checkIns!.filter((c) => c.sessionNumber === 2).map((c) => ({ ...c, status: c.id === 'c4' ? 'COMPLETED' : 'NOT_STARTED' })) };
    three.checkIns.push({ id: 'cw', participantId: 'p-w', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(5) });
    expect(whatNeedsYou([three], reader, [], NOW).line).toBe('In Sales team, Q3, 1 of 4 have checked in for the second check-in. 3 people have not checked in yet.');
  });
  it('says "you" rather than the reader’s own name', () => {
    const withMe = { ...sales, checkIns: sales.checkIns!.filter((c) => c.sessionNumber === 2 && c.id !== 'c5') };
    withMe.checkIns.push({ id: 'cw', participantId: 'p-w', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(5) });
    expect(whatNeedsYou([withMe], reader, [], NOW).line).toBe('In Sales team, Q3, 2 of 3 have checked in for the second check-in. You have not checked in yet.');
  });
  it('says nothing about a check-in that has ended', () => {
    expect(whatNeedsYou([{ ...sales, status: 'CLOSED' }], reader, [], NOW)).toMatchObject({ needs: [], line: null, comingUp: [] });
  });
});

/*
 * SCREENS REQUEST 86. A session somebody has started is open, whatever date it was first offered for.
 * Amani's own session 2 is under way while its `availableFrom` still says a week on, the same date
 * Neema's not-yet-started session 2 carries.
 */
describe('Today, for a session that was started before its own date', () => {
  const started: ListedCheckIn = {
    id: 'g-early', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: 'org', initiatorId: WAIRIMU,
    participants: [person('p-w5', WAIRIMU, 'Wairimu'), person('p-am', AMANI, 'Amani'), person('p-ne', 'u-neema', 'Neema')],
    checkIns: [
      { id: 'e1', participantId: 'p-am', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(200), completedAt: ago(190) },
      { id: 'e2', participantId: 'p-ne', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(200), completedAt: ago(190) },
      { id: 'e3', participantId: 'p-am', sessionNumber: 2, status: 'IN_PROGRESS', availableFrom: ahead(150) },
      { id: 'e4', participantId: 'p-ne', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ahead(150) },
    ],
    glance: { progress: { roundsDone: 1, roundsPlanned: 12 } },
  };

  it('Amani, who is in the middle of it, is told to carry on, and is not told it opens later', () => {
    const r = whatNeedsYou([started], { userId: AMANI, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(titles(r)).toEqual(['Your next check-in for Sales team, Q3']);
    expect(r.needs[0].action).toEqual({ label: 'Start it', to: '/checkin/e3' });
    expect(r.comingUp).toEqual([]);
  });

  it('Neema, who has not started, is still told that it opens later, and is offered nothing yet', () => {
    const r = whatNeedsYou([started], { userId: 'u-neema', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(titles(r)).toEqual([]);
    expect(r.comingUp).toEqual([{ at: ahead(150), what: 'Your second check-in for “Sales team, Q3” opens.', to: '/grounds/g-early', groundId: 'g-early' }]);
  });
});

/*
 * BEING AWAY (week 23). Found live, 1 October 2026 (item 6, journey/memory-requests-and-being-away-live.ts):
 * Amani, on approved leave until Friday 2 October, read "About ten minutes." under her check-in on
 * Today, exactly as somebody the round waits for, while the check-in page told her the round did not.
 */
describe('a turn of your own while you are on leave', () => {
  const first = { ...sales, checkIns: [{ id: 'm1', participantId: 'p-m', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: ago(200) }] };

  it('says the round does not wait for you, and that you may still answer, never how long it has been open', () => {
    const r = whatNeedsYou([first], { userId: MIRIAM, role: 'MEMBER', organizationId: 'org', awayUntil: '2026-10-02' }, [], NOW);
    expect(r.needs[0]).toMatchObject({
      title: 'Your first check-in for Sales team, Q3',
      detail: 'You are on leave until Friday 2 October, so this round does not wait for you. You can still answer it if you want to.',
      action: { label: 'Start it', to: '/checkin/m1' },
    });
  });

  it('reads as before for somebody who is not away', () => {
    const notAway = whatNeedsYou([first], { userId: MIRIAM, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(notAway.needs[0].detail).toBe('About ten minutes. It opened on 15 September.');
  });
});

/*
 * THE REPORT ROW IN THE APPROVED JOURNEY'S WORDS (stage 8, F5 part 3): "Today's report for deal progress is ready. Jane and John
 * see the Westgate deal differently. Read it". The title says "Today's" only for a daily check-in whose report was shared today;
 * who differs is the one sentence for a difference (reports/what-people-said-differently-about.ts), named for this reader.
 */
describe('Today, as Akinyi, whose daily deal check-in has today\'s report', () => {
  const deals: ListedCheckIn = {
    id: 'g-deals', label: 'Deal progress', status: 'ACTIVE', organizationId: 'org', initiatorId: 'u-akinyi', cadence: 'DAILY',
    participants: [person('p-a', 'u-akinyi', 'Akinyi'), person('p-j', 'u-jane', 'Jane'), person('p-jo', 'u-john', 'John')],
    checkIns: [], reportWaitingForMe: true, report: { releasedAt: ago(1) },
    whoDiffers: peopleSaidDifferentThingsAbout('the Westgate deal', 'Jane and John'),
  };
  it('reads "Today’s report for Deal progress is ready" and who sees what differently', () => {
    const r = whatNeedsYou([deals], { userId: 'u-akinyi', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    const row = r.needs.find((n) => n.key === 'report-g-deals')!;
    expect(row).toMatchObject({ title: 'Today’s report for Deal progress is ready', detail: 'Jane and John see the Westgate deal differently.', action: { label: 'Read it' } });
  });
  it('says "The report" when the report was shared on another day, or the check-in is not daily', () => {
    const r = whatNeedsYou([{ ...deals, report: { releasedAt: ago(30) } }, { ...deals, id: 'g-w', cadence: 'WEEKLY' }], { userId: 'u-akinyi', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.needs.filter((n) => n.kind === 'ready').map((n) => n.title)).toEqual(['The report for Deal progress is ready', 'The report for Deal progress is ready']);
  });
});

describe('"Decide how it ends" is not offered beside a check-in of your own that is still open (Mira\'s Today, runs 6 to 9)', () => {
  it('the rule is in the one place Today is built', () => {
    const src = require('fs').readFileSync(__dirname + '/what-needs-you.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toContain('done >= planned && !aTurnOfMineIsOpenHere');
  });
});
