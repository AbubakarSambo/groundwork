import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * EACH ITEM SHOWS ITS OWN EVIDENCE, BESIDE IT (Release 1B, pull request 2 of 3; references-upload-in-check-in.txt: "On Grace's
 * board, a moment later: Greenfield Hardware ... Signed order, 13 October ... See the order"). Read from the evidence filed when
 * the proof came in (proof-filed-on-its-item.ts), only while the organisation's Release 1B switch is on.
 *
 *  - Bisi, who runs it, and Juma, an admin who only reads, see every piece beside its deal;
 *  - Femi sees the evidence he added, beside his own deal, and never Ngozi's;
 *  - with the switch off, no row carries evidence, and the board reads exactly as before.
 */
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'), ...more,
});
const EVIDENCE = [
  { id: 'ev-ngozi', groundId: 'g-1', documentId: 'd-1', participantId: 'p-ngozi', workItemId: 'w-ngozi', readAs: 'A signed order', countsAsProof: true, shows: 'An order for 25 units, signed 13 September.', createdAt: new Date('2026-09-16T10:00:00Z') },
  { id: 'ev-femi', groundId: 'g-1', documentId: 'd-2', participantId: 'p-femi', workItemId: 'w-femi', readAs: 'A photo', countsAsProof: false, shows: 'A cold room at the kitchen.', createdAt: new Date('2026-09-17T10:00:00Z') },
];
const RUN = (switchOn: boolean | undefined): Setup => ({
  ...SALES_RUN,
  kindOfWork: 'sales team',
  createdByUserId: 'u-setup',
  clock: { now: new Date('2026-09-23T15:00:00Z'), endsAt: new Date('2026-09-30T17:00:00Z') },
  items: [
    item('w-ngozi', 'Ikeja Bakery', { stage: 'Won', ownerParticipantId: 'p-ngozi', addedByUserId: 'u-bisi' }),
    item('w-femi', 'Mama Ngozi Kitchens', { stage: 'Pitched', ownerParticipantId: 'p-femi', addedByUserId: 'u-bisi' }),
  ],
  prismaExtras: {
    organization: { findUnique: jest.fn(async () => (switchOn === undefined ? null : { id: 'org-1', release1bTabsOn: switchOn, release1SalesBoardOn: false, timeZone: null })) },
    itemEvidence: { findMany: jest.fn(async (args: any) => EVIDENCE.filter((e) => (args?.where?.workItemId?.in ?? []).includes(e.workItemId))) },
  },
});
const rowsOf = (b: any) => (b.workRecords ?? []).flatMap((s: any) => (s.rows ?? []) as any[]);
const evidenceOn = (b: any, name: string) => rowsOf(b).find((r: any) => r.name === name)?.evidence;

describe('with Release 1B’s switch on, each deal shows its own evidence', () => {
  it.each([['Bisi, who runs it', BISI], ['Juma, an admin who only reads', JUMA]])('%s sees every piece, beside its deal', async (_who, reader) => {
    const b = await boardAs(RUN(true), ...(reader as readonly [string, string]));
    expect(evidenceOn(b, 'Ikeja Bakery')).toEqual([{ id: 'ev-ngozi', documentId: 'd-1', readAs: 'A signed order', countsAsProof: true, shows: 'An order for 25 units, signed 13 September.', addedOn: '16 September', addedBy: expect.stringMatching(/^Ngozi/) }]);
    expect(evidenceOn(b, 'Mama Ngozi Kitchens').map((e: any) => [e.readAs, e.countsAsProof])).toEqual([['A photo', false]]);
  });

  it('Femi sees what he added, said as his, and never another person’s evidence', async () => {
    const b = await boardAs(RUN(true), ...FEMI);
    expect(evidenceOn(b, 'Mama Ngozi Kitchens')).toEqual([expect.objectContaining({ id: 'ev-femi', addedBy: 'You' })]);
    expect(JSON.stringify(b)).not.toContain('ev-ngozi');
    const n = await boardAs(RUN(true), ...NGOZI);
    expect(JSON.stringify(n)).not.toContain('ev-femi');
  });
});

describe('with it off, the board reads exactly as before', () => {
  it.each([[false], [undefined]])('no row carries evidence (switch %s), and nothing else changes', async (off) => {
    const b = await boardAs(RUN(off as any), ...BISI);
    expect(rowsOf(b).some((r: any) => 'evidence' in r)).toBe(false);
    const withNoEvidenceAtAll = await boardAs({ ...RUN(off as any), prismaExtras: { organization: RUN(off as any).prismaExtras!.organization } }, ...BISI);
    expect(JSON.parse(JSON.stringify(b))).toEqual(JSON.parse(JSON.stringify(withNoEvidenceAtAll)));
  });
});
