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
  it('is the person the speaker names in the check-in, and otherwise the speaker', () => {
    const kept = onlyRecordsTheLinesSay("founder's own check-in", OFFERED, LINES, null, PEOPLE_HERE);
    expect(kept.map((r) => [r.name, r.ownerParticipantId])).toEqual([
      ['taking on everything engineering', 'p-tunde'],
      ['covering the operational and business development aspects', 'p-ada'],
      ['keeping the product direction', 'p-ada'],
    ]);
  });

  it('keeps the speaker when the name given is not in the line, is nobody here, is the speaker, or is two people', () => {
    const line = { text: ADA_SAID, participantId: 'p-ada' };
    expect(theOwnerTheLineNames('Kemi', line, PEOPLE_HERE)).toBe('p-ada');
    expect(theOwnerTheLineNames('Ada', line, PEOPLE_HERE)).toBe('p-ada');
    expect(theOwnerTheLineNames('Tunde', { text: 'I am taking on everything engineering.', participantId: 'p-ada' }, PEOPLE_HERE)).toBe('p-ada');
    expect(theOwnerTheLineNames('Tunde', line, [...PEOPLE_HERE, { id: 'p-tunde-2', firstName: 'Tunde', lastName: 'Okafor' }])).toBe('p-ada');
    expect(theOwnerTheLineNames(null, line, PEOPLE_HERE)).toBe('p-ada');
    expect(theOwnerTheLineNames('Tunde Bakare', line, PEOPLE_HERE)).toBe('p-tunde');
  });

  it('the reader is told who said each line and asked for the owner only where the line clearly names one', async () => {
    expect(theRecordsPrompt("founder's own check-in")).toMatch(/A record is theirs unless the line clearly says it is somebody else's/);
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
      ['taking on everything engineering', 'p-tunde'],
      ['covering the operational and business development aspects', 'p-ada'],
      ['keeping the product direction', 'p-ada'],
    ]);
  });

  it('a record somebody says is a colleague\'s, with nobody\'s name on it yet, is not put to the lead as the colleague\'s claim', async () => {
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
    expect(updated[0].data.fields).not.toHaveProperty('_ownerClaim');
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
    item('w-eng', 'taking on everything engineering', 'p-tunde', 'e-ada'),
    item('w-ops', 'covering the operational and business development aspects', 'p-ada', 'e-tunde'),
  ],
};
const rowsOf = (board: any) => ((board.workRecords as any[]) ?? []).flatMap((s) => s.rows ?? []);

describe('the founders\' work plan, as each person reads it', () => {
  it('Ada, who runs it, reads engineering as Tunde\'s, said by her, and the business side as hers, said by Tunde', async () => {
    const rows = rowsOf(await boardAs(FOUNDERS as any, ...ADA));
    const eng = rows.find((r) => r.name === 'taking on everything engineering');
    const ops = rows.find((r) => r.name === 'covering the operational and business development aspects');
    expect([eng.owner, eng.saidBy]).toEqual(['Tunde Bakare', 'Ada']);
    expect([ops.owner, ops.saidBy]).toEqual(['Ada Nwosu', 'Tunde']);
  });

  it('Tunde reads engineering on his own work plan, said by Ada, and not the business side, which is Ada\'s', async () => {
    const rows = rowsOf(await boardAs(FOUNDERS as any, ...TUNDE));
    expect(rows.map((r) => [r.name, r.owner, r.saidBy])).toEqual([['taking on everything engineering', 'Tunde Bakare', 'Ada']]);
  });

  it('Juma, an admin who only reads, reads the same owners as Ada', async () => {
    const rows = rowsOf(await boardAs(FOUNDERS as any, ...JUMA));
    expect(rows.map((r) => [r.name, r.owner])).toEqual([
      ['taking on everything engineering', 'Tunde Bakare'],
      ['covering the operational and business development aspects', 'Ada Nwosu'],
    ]);
  });
});
