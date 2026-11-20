import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, JUMA, type Setup } from './the-switchboards-sections-harness';
import { isASalesKind, oneOfTheKinds, RECORDS_FOR_EACH_KIND, theRecordsPrompt, THE_SALES_KINDS } from './the-kind-of-work';
import { THE_FUNCTION_OF_A_KIND_OF_WORK } from './function-detection';

/**
 * A SALES TEAM IS SERVED THE SALES BOARD (release plan, Release 1: "Set Drop Access's type to sales team, not sales org").
 *
 * "sales team" is one lead and the reps under them; "sales org" is a sales organisation of several teams. Until Release 4
 * draws the sales organisation's own board, both are served the same sales board. So a check-in that is a sales team must
 * read, for every reader, exactly what the same check-in reads as a sales org: the lead who runs it, an admin who only reads,
 * and the two people who check in, with and without seeing each other. Nothing more reaches a participant because of it.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const aim = (id: string, name: string, n: number, count: number) => ({
  id, groundId: 'g-1', name, target: n, count, prevCount: count, ownerParticipantId: null, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null, assumes: [], direction: 'AIM',
});
const RUN = (kindOfWork: string): Setup => ({
  ...SALES_RUN,
  kindOfWork,
  createdByUserId: 'u-setup',
  clock: { now: new Date('2026-09-23T15:00:00Z'), endsAt: new Date('2026-09-30T17:00:00Z') },
  recordLines: [
    { id: 'e-ngozi', participantId: 'p-ngozi', text: 'Six facilities are approved out of my total target of 14 for the quarter.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: null, createdAt: new Date('2026-09-16T17:00:00Z') },
    { id: 'e-femi', participantId: 'p-femi', text: 'I pitched Mama Ngozi Kitchens and Lekki Cold Rooms is qualified.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: null, createdAt: new Date('2026-09-16T16:00:00Z') },
  ],
  items: [
    item('w-ngozi', 'Ikeja Bakery', { stage: 'Won', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi' }),
    item('w-femi', 'Mama Ngozi Kitchens', { stage: 'Pitched', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi' }),
    item('w-femi-2', 'Lekki Cold Rooms', { stage: 'Qualified', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi', dueAt: new Date('2026-09-28T00:00:00Z') }),
    item('w-lead', 'Plateau Foods', { stage: 'Contacted', addedByUserId: 'u-bisi' }),
  ],
  objectives: [aim('o-approved', 'Approved facilities this quarter', 40, 38)],
});

/** The board as served, with the kind itself set aside: the one place the two are meant to differ. */
const without = (b: any) => JSON.parse(JSON.stringify({ ...b, kindOfWork: undefined, /* 15 November 2026: every board is on, so the board now also names the board its kind picks (the sales board for a team, the sales organisation board for an organisation): the second place the two are meant to differ. */ switchboard: undefined }));

describe('a sales team reads the sales board, as each reader reads it', () => {
  it.each([
    ['Bisi, who runs it', BISI],
    ['Juma, an admin who only reads', JUMA],
    ['Femi, who checks in', FEMI],
    ['Ngozi, who checks in', NGOZI],
  ])('%s reads, word for word, what the same check-in reads as a sales organisation', async (_who, reader) => {
    const asATeam = await boardAs(RUN('sales team'), ...(reader as readonly [string, string]));
    const asAnOrg = await boardAs(RUN('sales org'), ...(reader as readonly [string, string]));
    expect(asATeam.kindOfWork).toBe('sales team');
    expect(asAnOrg.kindOfWork).toBe('sales org');
    expect(without(asATeam)).toEqual(without(asAnOrg));
  });

  it('the lead reads the sales board of a sales team: each deal in its group, and the gap to close', async () => {
    const b = await boardAs(RUN('sales team'), ...BISI);
    const grid = (b.workRecords ?? []).find((s: any) => s.section === 'Deal grid');
    expect(grid.rows.map((r: any) => r.name)).toEqual(expect.arrayContaining(['Ikeja Bakery', 'Mama Ngozi Kitchens', 'Lekki Cold Rooms', 'Plateau Foods']));
    expect(grid.rows.every((r: any) => typeof r.group === 'string')).toBe(true);
    expect(b.toCloseTheGap.says).toBe('2 more are needed by 30 September. There is 1 open deal on record, so even if it closes, 1 more would be needed. Each open deal is counted as one toward the aim of 40.');
  });

  it('where people do not see each other, a person in a sales team reads only their own deals, as in a sales organisation', async () => {
    const run = { ...RUN('sales team'), peersVisibleToEachOther: false };
    const femi = await boardAs(run, ...FEMI);
    const names = (femi.workRecords ?? []).flatMap((s: any) => (s.rows ?? []).map((r: any) => r.name));
    expect(names).not.toContain('Ikeja Bakery');
    expect(without(femi)).toEqual(without(await boardAs({ ...RUN('sales org'), peersVisibleToEachOther: false }, ...FEMI)));
  });
});

describe('the two sales kinds share one sales path', () => {
  it('both are sales, nothing else is, and both keep the same records and stages', () => {
    expect([...THE_SALES_KINDS]).toEqual(['sales team', 'sales org']);
    expect(isASalesKind('sales team')).toBe(true);
    expect(isASalesKind(' Sales Org ')).toBe(true);
    expect(isASalesKind('engineering release')).toBe(false);
    expect(isASalesKind('sales')).toBe(false);
    expect(isASalesKind(null)).toBe(false);
    expect(oneOfTheKinds('sales team')).toBe('sales team');
    expect(RECORDS_FOR_EACH_KIND['sales team']).toBe(RECORDS_FOR_EACH_KIND['sales org']);
    expect(THE_FUNCTION_OF_A_KIND_OF_WORK['sales team']).toBe(THE_FUNCTION_OF_A_KIND_OF_WORK['sales org']);
  });

  it('the records read from a sales team\'s lines are asked for as deals, with the sales stages', () => {
    const p = theRecordsPrompt('sales team');
    expect(p).toContain('about a sales team');
    expect(p).toContain('- deals (give kind as one of: "deal"). Stages, in order: Contacted, Need established, Pitched, Qualified, Quoted, Won');
  });
});
