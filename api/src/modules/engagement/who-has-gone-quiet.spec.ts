import { sendWhoHasGoneQuiet, theTeamWords, theAcrossWords, theQuietIn } from './who-has-gone-quiet';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * JOURNEYS 9 AND 7: PEOPLE WHO HAVE STOPPED ANSWERING, AS WAIRIMU READS IT (decision 109; spec sections 15 to 17).
 *
 * Journey 9: on "Sales team, Q4" six people can answer besides her. Two never answered. Omar and Vera answered session 1 and not session 2. Bisi and
 * Femi answered both. She is told it is most of the team, once, as one thing.
 * Journey 7: the same people spread over three check-ins, none of them most of its team. She is told once across them.
 */
/* The "of how many" is the one count since 1 November 2026 (how-many-have-answered.ts): the board's own number, with the lead counted in a
   session she answered (decision 133), so each denominator below is one more than when Today counted for itself. */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const NOW = new Date('2026-10-28T10:00:00Z');
const S2 = new Date('2026-10-12T08:00:00Z');
const S1 = new Date('2026-10-05T08:00:00Z');

const who = (id: string, first: string, extra: any = {}) => ({ userId: `u-${id}`, managingOnly: false, nameGiven: null, user: { firstName: first, lastName: null, awaitingOrgApproval: false }, ...extra });
const row = (pid: string, first: string, session: number, status: string, created = session === 1 ? S1 : S2, extra: any = {}) => ({ participantId: pid, sessionNumber: session, status, createdAt: created, participant: who(pid, first, extra) });

const salesRows = [
  row('lead', 'Wairimu', 1, 'COMPLETED'), row('lead', 'Wairimu', 2, 'COMPLETED'),
  row('a', 'Abigail', 1, 'NOT_STARTED'), row('a', 'Abigail', 2, 'NOT_STARTED'),
  row('b', 'Bisi', 1, 'NOT_STARTED'), row('b', 'Bisi', 2, 'NOT_STARTED'),
  row('o', 'Omar', 1, 'COMPLETED'), row('o', 'Omar', 2, 'NOT_STARTED'),
  row('v', 'Vera', 1, 'COMPLETED'), row('v', 'Vera', 2, 'NOT_STARTED'),
  row('f', 'Femi', 1, 'COMPLETED'), row('f', 'Femi', 2, 'COMPLETED'),
  row('k', 'Kofi', 1, 'COMPLETED'), row('k', 'Kofi', 2, 'COMPLETED'),
];

function world(groundsRows: Record<string, any[]>, opts: { told?: boolean; outcome?: 'sent' | 'suppressed' } = {}) {
  const told = new Set<string>();
  if (opts.told) told.add('x');
  const sent: any[] = [];
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === RELEASE_MOMENT_KEY ? { value: { at: RELEASE.toISOString() } } : told.has(where.key) || (opts.told && where.key.startsWith('engagement.once.gone-quiet')) ? { key: where.key } : null)),
      create: jest.fn(async ({ data }: any) => { told.add(data.key); return data; }),
    },
    ground: { findMany: jest.fn(async () => Object.keys(groundsRows).map((id) => ({ id, label: id === 'g1' ? 'Sales team, Q4' : id === 'g2' ? 'Kenya launch' : 'Product', initiatorId: 'u-lead' }))) },
    checkIn: { findMany: jest.fn(async ({ where }: any) => groundsRows[where.groundId] ?? []) },
    user: { findUnique: jest.fn(async () => ({ email: 'wairimu@x.test', firstName: 'Wairimu', deletedAt: null, isActive: true })) },
  };
  const email = { sendWhoHasGoneQuiet: jest.fn(async (to: string, subject: string, lines: string[], linkLabel: string, linkUrl: string) => { sent.push({ to, subject, lines, linkLabel, linkUrl }); return opts.outcome ?? 'sent'; }) };
  return { prisma, run: () => sendWhoHasGoneQuiet({ prisma, email, frontendUrl: 'https://app.test/' }, NOW), sent, told };
}

describe('journey 9: most of one team has stopped', () => {
  it('Wairimu reads one message about the team, the two kinds of quiet, and who answered before and stopped', async () => {
    const w = world({ g1: salesRows });
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toEqual([{
      to: 'wairimu@x.test',
      subject: 'Four of seven people on "Sales team, Q4" have not answered the latest check-in',
      lines: [
        /* "Of the seven" is the one count (1 November 2026): the board's own number, the lead counted in a session she answered (decision 133). */
        'Hello Wairimu. Four of the seven people on "Sales team, Q4" have not answered the latest check-in, which opened more than a week ago.',
        'Two have never answered, and Omar and Vera answered before and have not answered since.',
        'If you want to know what is in the way, asking one of them directly is the quickest way to find out.',
      ],
      linkLabel: 'See who has answered',
      linkUrl: 'https://app.test/grounds/g1/board',
    }]);
    const text = JSON.stringify(w.sent);
    expect(text).not.toMatch(/Abigail|Bisi/);
    expect(text).not.toMatch(/too long|ahead|behind|lazy|disengag|best|worst|blame/i);
    expect(text).not.toMatch(/remind(ed)? them again/i);
  });
});

describe('journey 7: spread over several check-ins', () => {
  it('is said once across them, a sentence each, with no check-in called a failure', async () => {
    const one = (label: string, quiet: string[]) => [
      row('lead', 'Wairimu', 2, 'COMPLETED'),
      ...['p1', 'p2', 'p3', 'p4'].map((p, i) => row(`${label}${p}`, `P${i}`, 2, quiet.includes(p) ? 'NOT_STARTED' : 'COMPLETED')),
    ];
    const w = world({ g1: one('a', ['p1']), g2: one('b', ['p2']), g3: one('c', ['p3']) });
    /* nobody closed anything, so there is no positive line */
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent[0].subject).toBe('Three people have not answered the latest check-in across three of your check-ins');
    expect(w.sent[0].lines[0]).toBe('Hello Wairimu. Three people have not answered the latest check-in, across three of your check-ins.');
    expect(w.sent[0].lines.slice(1, 4)).toEqual(['In "Sales team, Q4", one has never answered.', 'In "Kenya launch", one has never answered.', 'In "Product", one has never answered.']);
    expect(w.sent[0].linkUrl).toBe('https://app.test/grounds');
  });
  it('and names, as a fact, somebody who answered before and has not since', () => {
    expect(theAcrossWords('W', [{ label: 'A', ofHowMany: 5, neverAnswered: 0, stoppedAfterAnswering: ['Omar'] }, { label: 'B', ofHowMany: 5, neverAnswered: 2, stoppedAfterAnswering: [] }]).lines[1])
      .toBe('In "A", Omar answered before and has not answered since.');
    expect(theTeamWords('W', { label: 'A', ofHowMany: 5, neverAnswered: 3, stoppedAfterAnswering: [] }).lines[1]).toBe('Three have never answered.');
  });
});

describe('one check-in, fewer than most', () => {
  it('is said with the check-in\'s name, not as "stopped"', async () => {
    const rows = [row('lead', 'Wairimu', 2, 'COMPLETED'), ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((p, i) => row(p, `P${i}`, 2, i < 3 ? 'NOT_STARTED' : 'COMPLETED'))];
    const w = world({ g1: rows });
    await w.run();
    expect(w.sent[0].subject).toBe('Three people have not answered the latest check-in in "Sales team, Q4"');
    expect(w.sent[0].lines[0]).toBe('Hello Wairimu. Three of the nine people in "Sales team, Q4" have not answered the latest check-in.');
    expect(JSON.stringify(w.sent)).not.toMatch(/stopped answering|have stopped/i);
  });
  it('says a positive only as a plain fact about the one person who did all of it, and otherwise leaves it out', async () => {
    const rows = [row('lead', 'Wairimu', 2, 'COMPLETED'), ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((p, i) => row(p, `P${i}`, 2, i < 3 ? 'NOT_STARTED' : 'COMPLETED'))];
    const all = world({ g1: rows });
    all.prisma.groundCommitment = { findMany: jest.fn(async () => [{ participantId: 'f' }, { participantId: 'f' }, { participantId: 'f' }, { participantId: 'f' }]) };
    await all.run();
    expect(all.sent[0].lines).toContain('Four things people said they would do were done, all by P5.');
    /* one check-in is named once: in the subject and the first line, not again in every sentence */
    expect(all.sent[0].lines.slice(1).join(' ')).not.toContain('Sales team, Q4');
    expect(all.sent[0].lines[1]).toBe('Three have never answered.');
    const shared = world({ g1: rows });
    shared.prisma.groundCommitment = { findMany: jest.fn(async () => [{ participantId: 'f' }, { participantId: 'g' }]) };
    await shared.run();
    expect(shared.sent[0].lines.join(' ')).not.toMatch(/were done|was done/);
    expect(shared.sent[0].lines.join(' ')).not.toMatch(/ahead|behind|strong|best/i);
  });
});

describe('who is not written to', () => {
  it('somebody on approved leave is not counted as having gone quiet, and is not named', () => {
    const q = theQuietIn(salesRows, 'Sales team, Q4', 'u-lead', NOW, RELEASE, new Set(['o']));
    expect(q).toMatchObject({ ofHowMany: 6, neverAnswered: 2, stoppedAfterAnswering: ['Vera'] });
    expect(JSON.stringify(q)).not.toContain('Omar');
  });
  it('only asks for check-ins made at or after the release', async () => {
    const w = world({ g1: salesRows });
    await w.run();
    expect((w.prisma.ground.findMany.mock.calls[0] as any)[0].where.createdAt).toEqual({ gte: RELEASE });
  });
  it('fewer than three people', async () => {
    const few = [row('lead', 'W', 2, 'COMPLETED'), row('a', 'A', 2, 'NOT_STARTED'), row('b', 'B', 2, 'NOT_STARTED'), row('c', 'C', 2, 'COMPLETED')];
    expect(await world({ g1: few }).run()).toEqual({ tried: 0 });
  });
  it('a latest session that opened less than a week ago', async () => {
    const young = salesRows.map((r) => (r.sessionNumber === 2 ? { ...r, createdAt: new Date('2026-10-25T08:00:00Z') } : r));
    expect(await world({ g1: young }).run()).toEqual({ tried: 0 });
  });
  it('a latest session whose row was made long ago but became available less than a week ago (found on the test bed)', async () => {
    /* The row for session 2 is made when session 1 is answered, a week or more before session 2 opens, so its own date says nothing of when it opened. */
    const waiting = salesRows.map((r) => (r.sessionNumber === 2 ? { ...r, createdAt: new Date('2026-10-12T08:00:00Z'), availableFrom: new Date('2026-10-25T08:00:00Z') } : r));
    expect(await world({ g1: waiting }).run()).toEqual({ tried: 0 });
    const open = salesRows.map((r) => (r.sessionNumber === 2 ? { ...r, createdAt: new Date('2026-10-25T08:00:00Z'), availableFrom: new Date('2026-10-12T08:00:00Z') } : r));
    expect(await world({ g1: open }).run()).toEqual({ tried: 1 });
  });
  it('a check-in whose latest session opened before the release', async () => {
    const old = salesRows.map((r) => ({ ...r, createdAt: new Date('2026-09-10T08:00:00Z') }));
    expect(await world({ g1: old }).run()).toEqual({ tried: 0 });
  });
  it('a lead already told this week, and tried again if it was refused', async () => {
    expect(await world({ g1: salesRows }, { told: true }).run()).toEqual({ tried: 0 });
    const refused = world({ g1: salesRows }, { outcome: 'suppressed' });
    await refused.run();
    expect(refused.told.size).toBe(0);
  });
  it('the lead herself is never counted as one who has gone quiet', async () => {
    const leadQuiet = salesRows.map((r) => (r.participantId === 'lead' && r.sessionNumber === 2 ? { ...r, status: 'NOT_STARTED' } : r));
    const w = world({ g1: leadQuiet });
    await w.run();
    expect(w.sent[0].lines[0]).toContain('Four of the six');
  });
});

/**
 * JOURNEY 7 AS THE SPEC WORDS IT (found on the test bed, 21 October): "Launch readiness" has twelve people, seven of the eleven besides Wairimu have not
 * answered the latest check-in, and Amani has closed all four of the things people said they would do. The message about most of a team said only the seven.
 */
describe('when most of a team is quiet and one person has closed everything that was closed', () => {
  const c = { label: 'Launch readiness', ofHowMany: 11, neverAnswered: 0, stoppedAfterAnswering: ['Lerato', 'Kito', 'Imani', 'Peter', 'Neema', 'Fatuma', 'Tobi'], closedAllBy: { name: 'Amani', count: 4 } };
  it('says the plain fact beside it, with "and" and never "but", in the subject and the body', () => {
    const w = theTeamWords('Wairimu', c);
    expect(w.subject).toBe('Seven of 11 people on "Launch readiness" have not answered the latest check-in, and four things people said they would do were done, all by Amani');
    expect(w.lines).toContain('Four things people said they would do were done, all by Amani.');
    expect(w.lines.join(' ')).not.toMatch(/\bbut\b|ahead|behind|strong|best|worst/i);
  });
  it('is the message it was where nobody closed all of it', () => {
    const w = theTeamWords('Wairimu', { ...c, closedAllBy: null });
    expect(w.subject).toBe('Seven of 11 people on "Launch readiness" have not answered the latest check-in');
    expect(w.lines.join(' ')).not.toContain('were done');
  });
  it('and a subject that would run too long keeps the count and leaves the fact to the body', () => {
    const w = theTeamWords('Wairimu', { ...c, label: 'Launch readiness for every depot in the western region', closedAllBy: { name: 'Amani Wekesa-Otieno', count: 4 } });
    expect(w.subject).toBe('Seven of 11 people on "Launch readiness for every depot in the western region" have not answered the latest check-in');
    expect(w.lines).toContain('Four things people said they would do were done, all by Amani Wekesa-Otieno.');
  });
});

/*
 * NIGHT QUALITY RUN 1, JARED OKOTH: HE MISSED TWO, AND THE CLOCK CLOSED BOTH. A session the clock closed with nothing said was read as
 * answered, so Esther was never told Jared had gone quiet, or was told he "answered before" when he never had.
 */
describe('a check-in the clock closed with nothing said is not an answer', () => {
  const { CLOSED_BY_THE_CLOCK } = jest.requireActual('../../common/closed-by-the-clock');
  const clockClosed = (pid: string, first: string, session: number, created: Date) => ({ ...row(pid, first, session, 'COMPLETED', created), closedReason: CLOSED_BY_THE_CLOCK, turns: [] });
  const answered = (pid: string, first: string, session: number, created: Date) => ({ ...row(pid, first, session, 'COMPLETED', created), closedReason: null, turns: [{ id: 't' }] });
  const team = (jared: any[]) => [
    answered('lead', 'Esther', 1, S1), answered('lead', 'Esther', 2, S2),
    answered('c', 'Collins', 1, S1), answered('c', 'Collins', 2, S2),
    answered('h', 'Hassan', 1, S1), answered('h', 'Hassan', 2, S2),
    ...jared,
  ];

  it('Jared, with both of his sessions closed by the clock, is counted as never having answered', () => {
    const q = theQuietIn(team([clockClosed('j', 'Jared', 1, S1), clockClosed('j', 'Jared', 2, S2)]), 'Lakeshore sales', 'u-lead', NOW, RELEASE);
    expect(q).toEqual({ label: 'Lakeshore sales', ofHowMany: 4, neverAnswered: 1, stoppedAfterAnswering: [] });
  });

  it('Jared, with a third session waiting after two the clock closed, is not said to have answered before', () => {
    const q = theQuietIn(team([clockClosed('j', 'Jared', 1, S1), clockClosed('j', 'Jared', 2, S2), row('j', 'Jared', 3, 'NOT_STARTED', S2)]), 'Lakeshore sales', 'u-lead', NOW, RELEASE);
    expect(q?.neverAnswered).toBe(1);
    expect(q?.stoppedAfterAnswering).toEqual([]);
  });

  it('the lead, Esther, is never counted, whatever became of her own rows', () => {
    const q = theQuietIn([clockClosed('lead', 'Esther', 1, S1), clockClosed('lead', 'Esther', 2, S2), answered('c', 'Collins', 2, S2)], 'Lakeshore sales', 'u-lead', NOW, RELEASE);
    expect(q).toBeNull();
  });
});
