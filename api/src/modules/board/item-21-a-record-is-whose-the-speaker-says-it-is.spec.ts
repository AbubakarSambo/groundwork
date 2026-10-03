import { PartyType } from '@prisma/client';
import { BoardListener } from './board.listener';
import { onlyRecordsTheLinesSay, theOwnerTheLineNames, theRecordsPrompt } from './the-kind-of-work';
import { boardAs, answered, person, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE FOUNDER'S BOARD: A RECORD IS WHOSE THE SPEAKER SAYS IT IS.
 *
 * "Agreeing who does what as co-founders" (local test database, 9a904212). Every record read from a check-in was
 * given to whoever said the line. Ada Nwosu runs it, and Ada read on her own work plan "taking on everything
 * engineering", owner Ada Nwosu, from her own line "Tunde, as co-founder, is definitely taking on everything
 * engineering. ..."; and "covering the operational and business development aspects", owner Tunde Bakare, from
 * Tunde's "Ada, I believe, will be covering the operational and business development aspects. And funding, of
 * course." The record is now the person the speaker clearly names in the check-in, and otherwise the speaker.
 */
const ADA_SAID = 'Tunde, as co-founder, is definitely taking on everything engineering. Like, architecting the platform, building out new features, making sure everything is stable and scalable, all of that technical leadership.';
const TUNDE_SAID = 'Ada, I believe, will be covering the operational and business development aspects. And funding, of course.';
const ADA_OWN = 'I am keeping the product direction and fundraising.';

const PEOPLE_HERE = [
  { id: 'p-ada', firstName: 'Ada', lastName: 'Nwosu' },
  { id: 'p-tunde', firstName: 'Tunde', lastName: 'Bakare' },
];
const LINES = [
  { id: 'e-ada', participantId: 'p-ada', text: ADA_SAID },
  { id: 'e-tunde', participantId: 'p-tunde', text: TUNDE_SAID },
  { id: 'e-ada-own', participantId: 'p-ada', text: ADA_OWN },
];
/* What the model offers, owner included where the line names somebody else. */
const OFFERED = [
  { lineId: 'e-ada', kind: 'commitment', name: 'taking on everything engineering', owner: 'Tunde' },
  { lineId: 'e-tunde', kind: 'commitment', name: 'covering the operational and business development aspects', owner: 'Ada' },
  { lineId: 'e-ada-own', kind: 'commitment', name: 'keeping the product direction' },
];

describe('whose a record is', () => {
  it('is always the speaker, even where the model offers another owner (run-26)', () => {
    const kept = onlyRecordsTheLinesSay("founder's own check-in", OFFERED, LINES, null, PEOPLE_HERE);
    expect(kept.map((r) => [r.name, r.ownerParticipantId])).toEqual([
      ['taking on everything engineering', 'p-ada'],
      ['covering the operational and business development aspects', 'p-tunde'],
      ['keeping the product direction', 'p-ada'],
    ]);
  });

  it('keeps the speaker whatever name is given, even one in the line', () => {
    const line = { text: ADA_SAID, participantId: 'p-ada' };
    for (const offered of ['Kemi', 'Ada', 'Tunde', 'Tunde Bakare', null]) expect(theOwnerTheLineNames(offered, line, PEOPLE_HERE)).toBe('p-ada');
  });

  it('the reader is told who said each line and is not asked for an owner', async () => {
    expect(theRecordsPrompt("founder's own check-in")).toMatch(/Every record is the speaker's own; do not give an owner/);
    const created: any[] = [];
    const extract = jest.fn(async () => ({ records: OFFERED }));
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({
        kindOfWork: "founder's own check-in", workStages: null,
        participants: PEOPLE_HERE.map((p) => ({ id: p.id, nameGiven: null, user: { firstName: p.firstName, lastName: p.lastName } })),
      })) },
      recordEntry: { findMany: jest.fn(async () => LINES) },
      workItem: { findMany: jest.fn(async () => []), create: jest.fn(async (a: any) => { created.push(a.data); return { id: `w-${created.length}` }; }), update: jest.fn() },
    };
    await new BoardListener(prisma, { extract } as any).onCheckInCompleted({ checkInId: 'c1', groundId: 'g-1', participantId: 'p-ada', sessionNumber: 1 });
    const sent = (extract.mock.calls[0] as any[])[1][0].content as string;
    expect(sent).toContain('People in this check-in: Ada Nwosu, Tunde Bakare.');
    expect(sent).toContain(`[e-ada] Ada Nwosu said: ${ADA_SAID}`);
    expect(created.map((c) => [c.name, c.ownerParticipantId])).toEqual([
      ['taking on everything engineering', 'p-ada'],
      ['covering the operational and business development aspects', 'p-tunde'],
      ['keeping the product direction', 'p-ada'],
    ]);
  });

  it('a record somebody says is a colleague\'s is never put to the lead as the colleague\'s claim; any claim is the speaker\'s own', async () => {
    const updated: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({
        kindOfWork: "founder's own check-in", workStages: null,
        participants: PEOPLE_HERE.map((p) => ({ id: p.id, nameGiven: null, user: { firstName: p.firstName, lastName: p.lastName } })),
      })) },
      recordEntry: { findMany: jest.fn(async () => [LINES[0]]) },
      workItem: {
        findMany: jest.fn(async () => [{ id: 'w-eng', kind: 'commitment', name: 'taking on everything engineering', fields: {}, ownerParticipantId: null }]),
        create: jest.fn(), update: jest.fn(async (a: any) => { updated.push(a); return a; }),
      },
    };
    await new BoardListener(prisma, { extract: jest.fn(async () => ({ records: [OFFERED[0]] })) } as any)
      .onCheckInCompleted({ checkInId: 'c1', groundId: 'g-1', participantId: 'p-ada', sessionNumber: 1 });
    expect(updated[0].data.fields._ownerClaim?.participantId ?? 'p-ada').toBe('p-ada');
  });
});

/* The board, as each person reads it, from the records the writer now keeps. */
const ADA = ['u-ada', 'MEMBER'] as const;
const TUNDE = ['u-tunde', 'MEMBER'] as const;
const people = [
  { ...person('p-ada', 'u-ada', 'Ada', 'Nwosu', PartyType.INITIATOR), managingOnly: false },
  person('p-tunde', 'u-tunde', 'Tunde', 'Bakare'),
];
const item = (id: string, name: string, owner: string, source: string) => ({
  id, groundId: 'g-1', kind: 'commitment', name, stage: null, ownerParticipantId: owner, dueAt: null, fields: null, sourceEntryId: source,
  addedByUserId: null, createdAt: new Date('2026-09-30T17:00:00Z'), updatedAt: new Date('2026-09-30T17:00:00Z'),
});
const FOUNDERS = {
  people, initiatorId: 'u-ada', kindOfWork: "founder's own check-in",
  checkIns: [answered('p-ada', 1, '2026-09-30T16:00:00Z'), answered('p-tunde', 1, '2026-09-30T16:00:00Z')],
  recordLines: LINES.map((l) => ({ ...l, checkInId: `c1-${l.participantId}`, createdAt: new Date('2026-09-30T16:00:00Z') })),
  items: [
    item('w-eng', 'taking on everything engineering', 'p-tunde', 'e-ada') /* an older row that stored another owner */,
    item('w-ops', 'covering the operational and business development aspects', 'p-ada', 'e-tunde'),
  ],
};
const rowsOf = (board: any) => ((board.workRecords as any[]) ?? []).flatMap((s) => s.rows ?? []);

describe('the founders\' work plan, as each person reads it (a record is always its speaker\'s)', () => {
  it('Ada reads engineering as hers, because she said it, even where an older row stored Tunde', async () => {
    const rows = rowsOf(await boardAs(FOUNDERS as any, ...ADA));
    expect(rows.map((r) => [r.name, r.owner, r.saidBy])).toEqual([
      ['taking on everything engineering', 'Ada Nwosu', 'You'],
      ['covering the operational and business development aspects', 'Tunde Bakare', 'Tunde'],
    ]);
  });

  it('Tunde reads only the record he said, and not the one Ada said', async () => {
    const rows = rowsOf(await boardAs(FOUNDERS as any, ...TUNDE));
    expect(rows.map((r) => [r.name, r.owner, r.saidBy])).toEqual([['covering the operational and business development aspects', 'Tunde Bakare', 'You']]);
  });

  it('Juma, an admin who only reads, reads the same owners as Ada', async () => {
    const rows = rowsOf(await boardAs(FOUNDERS as any, ...JUMA));
    expect(rows.map((r) => [r.name, r.owner])).toEqual([
      ['taking on everything engineering', 'Ada Nwosu'],
      ['covering the operational and business development aspects', 'Tunde Bakare'],
    ]);
  });
});

/**
 * RUN-26, LOANS. Musa said "I signed for the loan" and the record was stored as Sunday's, so it reached Sunday's board.
 * A record is always owned by the person who said it, so Sunday never reads it, where people do not see each other.
 */
describe('run-26: Musa\'s "I signed for the loan", stored under Sunday', () => {
  const loanPeople = [
    { ...person('p-amaka', 'u-amaka', 'Amaka', 'Nwachukwu', PartyType.INITIATOR), managingOnly: true },
    person('p-sunday', 'u-sunday', 'Sunday', 'Eze'),
    person('p-musa', 'u-musa', 'Musa', 'Danjuma'),
  ];
  const LOANS = {
    people: loanPeople, initiatorId: 'u-amaka', kindOfWork: 'asset loans', peersVisibleToEachOther: false,
    checkIns: [answered('p-sunday', 1, '2026-09-30T16:00:00Z'), answered('p-musa', 1, '2026-09-30T16:00:00Z')],
    recordLines: [{ id: 'e-musa', participantId: 'p-musa', text: 'I signed for the loan.', checkInId: 'c1-p-musa', createdAt: new Date('2026-09-30T16:00:00Z') }],
    items: [{ ...item('w-loan', 'the loan', 'p-sunday', 'e-musa'), kind: 'loan' }],
  };
  const names = async (...who: readonly [string, string]) => rowsOf(await boardAs(LOANS as any, ...who)).map((r: any) => [r.name, r.owner]);

  it('Sunday does not read it', async () => {
    expect(JSON.stringify(await names(...(['u-sunday', 'MEMBER'] as const)))).not.toMatch(/the loan/);
  });
  it('Musa reads it as his; Amaka and an admin read it as Musa\'s', async () => {
    expect(await names('u-musa', 'MEMBER')).toEqual([['the loan', 'Musa Danjuma']]);
    expect(await names('u-amaka', 'MEMBER')).toEqual([['the loan', 'Musa Danjuma']]);
    expect(await names('u-juma', 'ADMIN')).toEqual([['the loan', 'Musa Danjuma']]);
  });
});
