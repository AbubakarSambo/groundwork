import { GroundScenario } from '@prisma/client';
import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * SCREENS REQUEST 112 (a): EACH DEAL IN ITS GROUP, WITH WHY, AS EACH READER READS IT.
 *
 * The prototype (board-as-lead.txt) groups the deal grid under "Likely by 30 September", "Possible", "Next
 * quarter", "Cooling" and "Cold", each with its reason. Here each group comes only from what the record holds
 * for a deal: its mark, the date given for it, the last day somebody spoke about it, and whether somebody said
 * what happens next. No group claims a criterion is met, and none is "Cold", because the record holds neither.
 *
 * The lines are word for word what each person said in the sales run (api/journey/all-24/re-f/sales.json), read
 * on 23 September, in a check-in that ends on 30 September.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const RUN: Setup = {
  ...SALES_RUN,
  kindOfWork: 'sales org',
  clock: { now: new Date('2026-09-23T15:00:00Z'), endsAt: new Date('2026-09-30T17:00:00Z') },
  recordLines: [
    { id: 'e-ngozi', participantId: 'p-ngozi', text: 'Six facilities are approved out of my total target of 14 for the quarter.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-ngozi', createdAt: new Date('2026-09-16T17:00:00Z') },
    { id: 'e-kwame', participantId: 'p-kwame', text: 'That N8 million disbursed represents three approved facilities.', recallBased: true, createdAt: new Date('2026-09-22T18:00:00Z') },
    { id: 'e-femi', participantId: 'p-femi', text: 'I have 31 applications that I\'ve taken from businesses.', recallBased: false, anchoredOrigin: null, anchoredDocumentId: 'doc-bisi', createdAt: new Date('2026-09-16T16:00:00Z') },
    { id: 'e-femi-2', participantId: 'p-femi', text: 'I filled out all the forms completely.', confirmedAt: new Date('2026-09-17T09:00:00Z'), createdAt: new Date('2026-09-22T16:00:00Z') },
    { id: 'e-ngozi-2', participantId: 'p-ngozi', text: 'I have already sent him a written escalation.', createdAt: new Date('2026-09-22T17:00:00Z') },
  ],
  documents: [
    { id: 'doc-ngozi', participantId: 'p-ngozi', fileName: 'approval-letters.pdf', visibility: 'EVERYONE' },
    { id: 'doc-bisi', participantId: 'p-bisi', fileName: 'pipeline.xlsx', visibility: 'EVERYONE' },
  ],
  items: [
    item('w-ngozi', 'Ikeja Bakery', { stage: 'Won', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi' }),
    item('w-kwame', 'Jos Grain Traders', { stage: 'Quoted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-kwame', dueAt: new Date('2026-10-15T00:00:00Z') }),
    item('w-femi', 'Mama Ngozi Kitchens', { stage: 'Pitched', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi' }),
    item('w-femi-2', 'Lekki Cold Rooms', { stage: 'Qualified', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi-2', dueAt: new Date('2026-09-28T00:00:00Z') }),
    item('w-ngozi-2', 'Head of Credit escalation', { stage: 'Need established', ownerParticipantId: 'p-ngozi', sourceEntryId: 'e-ngozi-2' }),
    item('w-lead', 'Plateau Foods', { stage: 'Contacted', addedByUserId: 'u-bisi' }),
  ],
};
const SETUP = ['u-setup', 'ADMIN'] as const;
/** A full sentence: a capital, an ending, and no colon, dash or arrow joining pieces. */
function walkEverySentence(lines: (string | null | undefined)[]): void {
  for (const line of lines) {
    if (line == null) continue;
    expect(line).toMatch(/^[A-Z"]/);
    expect(line).toMatch(/[.?]$/);
    expect(line).not.toMatch(/:\s|\s[-–—]\s|→|->/);
  }
}
const grid = (b: any) => ((b.workRecords ?? []) as any[]).find((s) => s.section === 'Deal grid');
const byGroup = (b: any) => Object.fromEntries((grid(b)?.groups ?? []).map((g: any) => [g.heading, g.rowIds]));
const why = (b: any, name: string) => grid(b)?.rows.find((r: any) => r.name === name)?.groupSays;

const EVERY_GROUP = {
  'Likely by 30 September': ['w-femi-2'],
  Possible: ['w-ngozi-2', 'w-lead'],
  'Next quarter': ['w-kwame'],
  Cooling: ['w-femi'],
  Won: ['w-ngozi'],
};

describe('request 112 (a): each deal in its group', () => {
  it.each([
    ['Bisi, who runs it', BISI, RUN],
    ['Juma, an admin who only reads', JUMA, RUN],
    ['the admin who set it up', SETUP, { ...RUN, createdByUserId: 'u-setup' }],
  ] as const)('%s reads every deal in its group, in the prototype\'s order', async (_who, reader, setup) => {
    const b = await boardAs(setup as Setup, reader[0], reader[1]);
    expect(byGroup(b)).toEqual(EVERY_GROUP);
    expect(Object.keys(byGroup(b))).toEqual(Object.keys(EVERY_GROUP));
  });

  it('each group says why, from the record only, and never that a criterion is met', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(grid(b).groups.map((g: any) => g.reason)).toEqual([
      "Each of these has proof or a colleague's confirmation, a date on or before 30 September, and word about it in the last week.",
      'Each of these is still open, but is missing proof, a date on or before 30 September, or word about it in the last week.',
      'The date given for each of these is after 30 September, when this check-in ends.',
      'Nobody has spoken about these in the last week, and nobody has said what happens next.',
      'Somebody reported each of these at Won, the last stage.',
    ]);
    expect(grid(b).groupsNote).toEqual([
      'Nothing on record says what a deal must show at each stage, so no group here says whether a criterion is met.',
      /* The stall rule is applied now, from the record (pilots after fixes, A4). */
        'A deal is stalled when a check-in says the customer has not answered and 3 working days have passed, with nothing said since that they answered.',
    ]);
    expect(JSON.stringify(grid(b).groups)).not.toMatch(/criterion proven|criteria met|Cold/);
  });

  it('each deal says why it is where it is', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(why(b, 'Lekki Cold Rooms')).toBe('A colleague confirmed it. The date given for it is 28 September. It was last spoken about on 22 September. Nobody has said what happens next.');
    expect(why(b, 'Mama Ngozi Kitchens')).toBe('It rests on what somebody said, with no proof yet. No date has been given for it. It was last spoken about on 16 September. Nobody has said what happens next.');
    expect(why(b, 'Jos Grain Traders')).toBe('It rests on what somebody said, with no proof yet. The date given for it is 15 October. It was last spoken about on 22 September. Nobody has said what happens next.');
    expect(why(b, 'Plateau Foods')).toBe('It was added on the board, not said in a check-in. No date has been given for it. Nobody has spoken about it in a check-in yet. Nobody has said what happens next.');
    expect(why(b, 'Ikeja Bakery')).toBe('Proof shows it. No date has been given for it. It was last spoken about on 16 September. Nobody has said what happens next.');
  });

  it('a deal somebody has said what happens next about is not cooling', async () => {
    const b = await boardAs({
      ...RUN,
      commitments: [...(RUN.commitments ?? []), {
        id: 'k-femi-mama', groundId: 'g-1', participantId: 'p-femi', text: 'I will call Mama Ngozi Kitchens on Friday.', status: 'UNKNOWN', statedInSession: 2,
        whenSaid: 'on Friday', saidWordForWord: true, whenSaidWordForWord: true, saidAgainIn: [], createdAt: new Date('2026-09-16T16:00:00Z'), updatedAt: new Date('2026-09-16T16:00:00Z'),
      }],
    }, ...BISI);
    expect(byGroup(b).Possible).toContain('w-femi');
    expect(why(b, 'Mama Ngozi Kitchens')).toMatch(/Somebody has said what happens next\.$/);
  });

  it('Femi reads only his own deals, each in its group', async () => {
    const b = await boardAs(RUN, ...FEMI);
    expect(byGroup(b)).toEqual({ 'Likely by 30 September': ['w-femi-2'], Cooling: ['w-femi'] });
  });

  it('Ngozi, where people see only themselves, reads only her own', async () => {
    const b = await boardAs({ ...RUN, peersVisibleToEachOther: false }, ...NGOZI);
    expect(byGroup(b)).toEqual({ Possible: ['w-ngozi-2'], Won: ['w-ngozi'] });
    expect(JSON.stringify(grid(b))).not.toMatch(/Lekki|Jos Grain|Mama Ngozi|Plateau/);
  });

  it('Kwame, a colleague giving a view on a performance plan, reads only his own', async () => {
    const b = await boardAs({ ...RUN, scenario: GroundScenario.PIP }, ...KWAME);
    expect(byGroup(b)).toEqual({ 'Next quarter': ['w-kwame'] });
  });

  it('with no end date, no deal is called likely or after the end, and it says why', async () => {
    const b = await boardAs({ ...RUN, clock: { now: new Date('2026-09-23T15:00:00Z'), runsUntilEnded: true } }, ...BISI);
    expect(Object.keys(byGroup(b))).toEqual(['Possible', 'Cooling', 'Won']);
    expect(grid(b).groupsNote).toContain('This check-in has no end date, so no deal can be said to be likely by the end, or to fall after it.');
  });

  it('an end that is not the end of a quarter is said as its day', async () => {
    const b = await boardAs({ ...RUN, clock: { now: new Date('2026-09-23T15:00:00Z'), endsAt: new Date('2026-10-10T17:00:00Z') } }, ...BISI);
    expect(Object.keys(byGroup(b))).toContain('After 10 October');
  });

  it('every sentence is a full sentence, with no colon, dash or arrow joining pieces', async () => {
    for (const reader of [BISI, FEMI, NGOZI, KWAME, JUMA]) {
      const g = grid(await boardAs(RUN, reader[0], reader[1]));
      walkEverySentence([...(g?.groups ?? []).map((x: any) => x.reason), ...(g?.groupsNote ?? []), ...(g?.rows ?? []).map((r: any) => r.groupSays)]);
    }
  });

  it('a board that is not about sales has no groups', async () => {
    const b = await boardAs({ ...RUN, kindOfWork: 'engineering release', items: [item('w-r', 'Release 2.1', { kind: 'release' })] }, ...BISI);
    expect(JSON.stringify(b.workRecords)).not.toMatch(/"groups"/);
  });
});

describe('a deal is won only with proof or a confirmation, on every reader\'s board (night quality run 2, Collins)', () => {
  /* Collins's own board showed "The group orders six." as Won; the lead's grid already said it was not shown yet. */
  const SAID_ONLY: Setup = {
    ...RUN,
    recordLines: [...(RUN.recordLines ?? []), { id: 'e-femi-3', participantId: 'p-femi', text: 'The group orders six.', recallBased: true, createdAt: new Date('2026-09-22T16:30:00Z') }],
    items: [...(RUN.items ?? []), item('w-femi-3', 'the group', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-femi-3' })],
  };
  it.each([['Femi, whose deal it is', FEMI], ['Bisi, who runs it', BISI]] as const)('%s reads it as said to be won, not shown yet, never as Won', async (_who, reader) => {
    const b = await boardAs(SAID_ONLY, reader[0], reader[1]);
    const row = grid(b)?.rows.find((r: any) => r.id === 'w-femi-3');
    expect(row.stageSays).toBe('Said to be won, not shown yet');
    expect(grid(b)?.rows.find((r: any) => r.id === 'w-ngozi')?.stageSays).toBeUndefined();
  });
});
