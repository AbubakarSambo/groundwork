import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';
import { whatNeedsYou, type ListedCheckIn } from './what-needs-you';
import { yourBoard } from './your-board';

/**
 * REQUEST 97, FROM GROUP 2'S REVIEW OF "SALES TEAM, Q3". One check-in, said one way, to each reader.
 *
 *   (a) one round, counted from one place, worded as the board words it ("the second check-in");
 *   (b) a count stored in a summary is not read as today's count;
 *   (c) starting your own turn is not a decision;
 *   (d) who runs it, where it stands, and whose login, said to a reader who is shown nobody else.
 *
 * Every sentence below is what a person reads, for each reader, off the real `list()` and `whatNeedsYou`.
 */
const LEAD = 'u-rukia';
const AMANI = 'u-amani';
const JUMA = 'u-juma';
const NOW = new Date('2026-10-01T09:00:00Z');
const day = 86_400_000;
const ago = (d: number) => new Date(NOW.getTime() - d * day);
const ahead = (d: number) => new Date(NOW.getTime() + d * day);

const person = (id: string, userId: string, type: string, first: string, last: string, n: number) => ({
  id, userId, email: `${first.toLowerCase()}@x.test`, partyType: type, createdAt: new Date(`2026-09-0${n}`), user: { firstName: first, lastName: last },
});

function row(over: any = {}) {
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'OKR_ALIGNMENT',
    cadence: 'WEEKLY', timelineDays: 84, updatedAt: ago(1), restrictExternalVisibility: false, peersVisibleToEachOther: true,
    participants: [
      { ...person('p-rukia', LEAD, 'INITIATOR', 'Rukia', 'Otieno', 1), managingOnly: true },
      person('p-amani', AMANI, 'PARTICIPANT', 'Amani', 'Njoroge', 2),
      person('p-omar', 'u-omar', 'PARTICIPANT', 'Omar', 'Ali', 3),
    ],
    checkIns: [
      { id: 'c1', participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(14), completedAt: ago(13), createdAt: ago(14) },
      { id: 'c2', participantId: 'p-omar', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(14), completedAt: ago(13), createdAt: ago(14) },
      { id: 'c3', participantId: 'p-amani', sessionNumber: 2, status: 'COMPLETED', availableFrom: ago(7), completedAt: ago(6), createdAt: ago(7) },
      { id: 'c4', participantId: 'p-omar', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(7), createdAt: ago(7) },
      { id: 'c5', participantId: 'p-amani', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: ahead(5), createdAt: ago(7) },
      { id: 'c6', participantId: 'p-omar', sessionNumber: 3, status: 'NOT_STARTED', availableFrom: ahead(5), createdAt: ago(7) },
    ],
    report: { releasedAt: null, agreements: [], divergences: [] }, reportRounds: [], dependencies: [], reportActivations: [],
    ...over,
  };
}

function service(over: any = {}) {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([row(over)]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
}
async function listAs(userId: string, role: string, over: any = {}) {
  return ((await service(over).list('org1', userId, `${userId}@x.test`, role)) as any[])[0];
}

describe('(a) one round, from one place', () => {
  it('the list says which check-in the team is on, and the sentence is the same for every reader', async () => {
    for (const [u, role] of [[LEAD, 'MEMBER'], [AMANI, 'MEMBER'], [JUMA, 'ADMIN']] as const) {
      const r = await listAs(u, role);
      expect(r.glance.progress.openRound).toBe(2);
      expect(r.glance.progress.whereItIs).toBe('It is on the second check-in of 12.');
      expect(r.glance.progress.howManyAreDone).toBe('1 of the 12 check-ins is done.');
    }
  });

  it('Today counts that round for the lead, and names it as the board does', async () => {
    const r = await listAs(LEAD, 'MEMBER');
    const t = whatNeedsYou([r as ListedCheckIn], { userId: LEAD, role: 'MEMBER', organizationId: 'org1' }, [], NOW);
    expect(t.line).toBe('In Sales team, Q3, 1 of 2 have checked in for the second check-in. Omar has not checked in yet.');
  });

  it('Coming up is the team\'s next check-in to the lead, and is Amani\'s own to Amani, and both are the third', async () => {
    const lead = whatNeedsYou([(await listAs(LEAD, 'MEMBER')) as ListedCheckIn], { userId: LEAD, role: 'MEMBER', organizationId: 'org1' }, [], NOW);
    const amani = whatNeedsYou([(await listAs(AMANI, 'MEMBER')) as ListedCheckIn], { userId: AMANI, role: 'MEMBER', organizationId: 'org1' }, [], NOW);
    expect(lead.comingUp.map((c) => c.what)).toEqual(['The third check-in for Sales team, Q3 opens.']);
    expect(amani.comingUp.map((c) => c.what)).toEqual(['Your third check-in for Sales team, Q3 opens.']);
  });

  it('the You board counts what you finished in the same word', () => {
    const board = yourBoard(
      [row() as any as ListedCheckIn],
      { userId: AMANI, organizationId: 'org1' },
      { objectives: [], ownedTargets: [], commitments: [], coaching: [], todos: [] },
      NOW,
    );
    expect(board.checkIns[0].line).toBe('You have finished two check-ins.');
  });
});

describe('(b) a count written into the report is not read as today\'s count', () => {
  const stored = {
    report: { releasedAt: new Date(), agreements: [], divergences: [], sharedAs: null, theOpening: 'All three people have answered. People agree on the target and differ on the date.' },
    reportRounds: [{ sessionNumber: 1, finding: 'The date differs.', sharedPicture: 'All three people have answered. People agree on the target.' }],
  };
  it('Amani, and the lead, are not told "All three people have answered" on a check-in that has more people in it', async () => {
    for (const [u, role] of [[LEAD, 'MEMBER'], [AMANI, 'MEMBER']] as const) {
      const r = await listAs(u, role, stored);
      expect(r.latestSummary).toBe('People agree on the target and differ on the date.');
      const t = whatNeedsYou([{ ...r, reportWaitingForMe: true } as ListedCheckIn], { userId: u, role: 'MEMBER', organizationId: 'org1' }, [], NOW);
      const need = t.needs.find((n) => n.key === 'report-g1')!;
      expect(need.title).toBe('The report for Sales team, Q3 is ready');
      expect(need.detail).toBe('People agree on the target and differ on the date.');
    }
  });
});

describe('(c) your own turn is its own kind', () => {
  it('"Your first check-in" is served as your_turn, not decide', () => {
    const g = { ...row(), checkIns: [{ id: 'f1', participantId: 'p-amani', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: ago(1) }] } as any;
    const t = whatNeedsYou([g], { userId: AMANI, role: 'MEMBER', organizationId: 'org1' }, [], NOW);
    expect(t.needs.map((n) => [n.title, n.kind])).toEqual([['Your first check-in for Sales team, Q3', 'your_turn']]);
  });
  it('and a later turn is your_turn too, while deciding how it ends is still a decision', () => {
    const later = { ...row(), checkIns: [{ id: 'f2', participantId: 'p-amani', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: ago(1) }] } as any;
    expect(whatNeedsYou([later], { userId: AMANI, role: 'MEMBER', organizationId: 'org1' }, [], NOW).needs[0].kind).toBe('your_turn');
    const ends = { ...row(), glance: { progress: { roundsDone: 12, roundsPlanned: 12 } } } as any;
    expect(whatNeedsYou([ends], { userId: LEAD, role: 'MEMBER', organizationId: 'org1' }, [], NOW).needs.find((n) => n.key === 'end-g1')!.kind).toBe('decide');
  });
});

describe('(d) a check-in where people are not shown to each other, as Amani reads its row', () => {
  const hidden = { peersVisibleToEachOther: false };
  it('is told who runs it, by name, though she is shown nobody else', async () => {
    const r = await listAs(AMANI, 'MEMBER', hidden);
    expect(r.participants.map((p: any) => p.id)).toEqual(['p-amani']);
    expect(r.runByName).toBe('Rukia Otieno');
    expect(JSON.stringify(r)).not.toMatch(/Omar/);
  });
  it('is told where she stands in her own words, not "Just started" read from numbers she is not given', async () => {
    const r = await listAs(AMANI, 'MEMBER', hidden);
    expect(r.glance.progress.standsSaid).toBe('You have answered.');
    expect(r.glance.progress.ofPeople).toBe(0);
    const not = await listAs('u-omar', 'MEMBER', hidden);
    expect(not.glance.progress.standsSaid).toBe('You have not answered yet.');
  });
  it('the lead and an admin read the count they always did, and no sentence of hers', async () => {
    for (const [u, role] of [[LEAD, 'MEMBER'], [JUMA, 'ADMIN']] as const) {
      const r = await listAs(u, role, hidden);
      expect(r.glance.progress).toMatchObject({ answeredThisRound: 1, ofPeople: 2 });
      expect(r.glance.progress.standsSaid).toBeUndefined();
    }
  });
});

describe('(d) a check-in that is finished says so once', () => {
  const one = { timelineDays: 1, cadence: 'ONE_TIME', checkIns: [
    { id: 'o1', participantId: 'p-amani', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(3), completedAt: ago(2), createdAt: ago(3) },
    { id: 'o2', participantId: 'p-omar', sessionNumber: 1, status: 'COMPLETED', availableFrom: ago(3), completedAt: ago(2), createdAt: ago(3) },
  ] };
  it('one check-in, all done: one plain sentence, and nothing repeats it', async () => {
    const r = await listAs(LEAD, 'MEMBER', one);
    expect(r.glance.progress.whereItIs).toBe('The one check-in is finished.');
    expect(r.glance.progress.howManyAreDone).toBeNull();
    expect(JSON.stringify(r.glance)).not.toMatch(/1 of 1|sessions done|Session 1/);
  });
});

describe('(d) "Her login for the order system is holding it up" says whose', () => {
  const stuck = (onParticipantId: string | null) => ({
    dependencies: [{ id: 'd1', what: 'Her login for the order system', status: 'BLOCKING', createdAt: ago(9), fromParticipantId: 'p-amani', onParticipantId, onLabel: onParticipantId ? null : 'the supplier', namedTheThing: true }],
  });
  it('the lead who runs it, and an admin, read the name of the person it is waited on from', async () => {
    for (const [u, role] of [[LEAD, 'MEMBER'], [JUMA, 'ADMIN']] as const) {
      const r = await listAs(u, role, stuck('p-omar'));
      expect(r.glance.inTheWay.oldest).toBe("Omar's login for the order system");
    }
  });
  it('a participant where people are named to each other reads the name too', async () => {
    const r = await listAs(AMANI, 'MEMBER', stuck('p-omar'));
    expect(r.glance.inTheWay.oldest).toBe("Omar's login for the order system");
  });
  /* Request 105: a reader walled from colleagues is given their own waits, counted and named, and nobody
     else's. Before, Amani was given no blocker at all, her own included. The name of the person she waits on
     is still never given. */
  it('a participant where people are not shown to each other is given only her own wait, and no name', async () => {
    const r = await listAs(AMANI, 'MEMBER', { ...stuck('p-omar'), peersVisibleToEachOther: false });
    /* The list reads the days at the real clock, and the wait was raised 9 days before this file's NOW, so
       the days are counted from the wait itself: on 2 October this said 10 and the test failed on the date. */
    expect(r.glance.inTheWay).toMatchObject({ count: 1, oldest: "A colleague's login for the order system", daysWaiting: Math.floor((Date.now() - ago(9).getTime()) / day) });
    /* And the day it began, which reads the same at any hour (request 117, part 9). */
    expect(r.glance.inTheWay.sinceSays).toMatch(/^since \d{1,2} [A-Z][a-z]+$/);
    expect(JSON.stringify(r.glance)).not.toMatch(/Omar/);
    expect(JSON.stringify(r.participants)).not.toMatch(/Omar/);
  });
  it('where nobody is said to be waited on, it is "A colleague\'s", never a bare "Her"', async () => {
    const r = await listAs(LEAD, 'MEMBER', stuck(null));
    expect(r.glance.inTheWay.oldest).toBe("A colleague's login for the order system");
    expect(JSON.stringify(r)).not.toMatch(/oldestOnParticipantId/);
  });
});
