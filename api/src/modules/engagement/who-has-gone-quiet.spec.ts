import { sendWhoHasGoneQuiet, theTeamWords, theAcrossWords } from './who-has-gone-quiet';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * JOURNEYS 9 AND 7: PEOPLE WHO HAVE STOPPED ANSWERING, AS WAIRIMU READS IT (decision 109; spec sections 15 to 17).
 *
 * Journey 9: on "Sales team, Q4" six people can answer besides her. Two never answered. Omar and Vera answered session 1 and not session 2. Bisi and
 * Femi answered both. She is told it is most of the team, once, as one thing.
 * Journey 7: the same people spread over three check-ins, none of them most of its team. She is told once across them.
 */
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
  return { run: () => sendWhoHasGoneQuiet({ prisma, email, frontendUrl: 'https://app.test/' }, NOW), sent, told };
}

describe('journey 9: most of one team has stopped', () => {
  it('Wairimu reads one message about the team, the two kinds of quiet, and who answered before and stopped', async () => {
    const w = world({ g1: salesRows });
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent).toEqual([{
      to: 'wairimu@x.test',
      subject: 'Four of six people on "Sales team, Q4" have not answered the latest check-in',
      lines: [
        'Hello Wairimu. Four of the six people on "Sales team, Q4" have not answered the latest check-in, which opened more than a week ago.',
        'Two have never answered, and Omar and Vera answered before and have not answered since.',
        'Because it is most of the team, this is one thing about the team and not several people to be reminded one at a time. Groundwork has not changed or shortened the check-in.',
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
    expect(await w.run()).toEqual({ tried: 1 });
    expect(w.sent[0].subject).toBe('Three people have stopped answering across three of your check-ins');
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

describe('who is not written to', () => {
  it('fewer than three people', async () => {
    const few = [row('lead', 'W', 2, 'COMPLETED'), row('a', 'A', 2, 'NOT_STARTED'), row('b', 'B', 2, 'NOT_STARTED'), row('c', 'C', 2, 'COMPLETED')];
    expect(await world({ g1: few }).run()).toEqual({ tried: 0 });
  });
  it('a latest session that opened less than a week ago', async () => {
    const young = salesRows.map((r) => (r.sessionNumber === 2 ? { ...r, createdAt: new Date('2026-10-25T08:00:00Z') } : r));
    expect(await world({ g1: young }).run()).toEqual({ tried: 0 });
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
