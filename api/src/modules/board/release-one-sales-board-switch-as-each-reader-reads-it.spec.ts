import { boardAs, SALES_RUN, BISI, FEMI, KWAME, JUMA, handoff, type Setup } from './the-switchboards-sections-harness';
import { theReleaseOneSalesBoardIsOn } from './release-one-sales-board';

/**
 * RELEASE 1'S SALES BOARD, A SWITCH PER ORGANISATION, AS EACH READER READS IT (release plan, Part 0: "If a real client's
 * board looks wrong, switching it off returns them to their previous board with nothing lost").
 *
 * The same record, read with the switch on and off, and on a check-in whose kind is "sales team" (Drop Access) and "sales org".
 * Bisi runs it; Femi and Kwame check in; Juma is an admin who only reads. Femi's Kilele Hotel deal is won with an M-Pesa
 * message; his Wema deal is won on his word; Kwame waits on Bisi for an answer about a price, and Mama Pima has gone quiet.
 */
const NOW = new Date('2026-10-19T12:00:00Z');
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-10-12T15:00:00Z'), updatedAt: new Date('2026-10-12T15:00:00Z'), ...more,
});
const LINES = [
  { id: 'e-kilele', participantId: 'p-femi', type: 'PROGRESS', text: 'Kilele Hotel paid for all 40 units today.', recallBased: true, createdAt: new Date('2026-10-12T06:09:00Z'), disputedAt: null },
  { id: 'e-proof', participantId: 'p-femi', type: 'PROGRESS', text: 'Proof of payment. The M-Pesa message from Kilele.', recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: 'doc-mpesa', createdAt: new Date('2026-10-12T06:04:00Z'), disputedAt: null },
  { id: 'e-wema', participantId: 'p-femi', type: 'PROGRESS', text: 'Wema is won, 10 units, they will pay next week.', recallBased: true, createdAt: new Date('2026-10-12T06:10:00Z'), disputedAt: null },
  { id: 'e-juja', participantId: 'p-kwame', type: 'PROGRESS', text: 'I pitched Juja Hardware at KES 4,500 a unit.', recallBased: true, createdAt: new Date('2026-10-13T15:00:00Z'), disputedAt: null },
  { id: 'e-pima', participantId: 'p-kwame', type: 'PROGRESS', text: 'Mama Pima Stores has not answered my calls since Monday.', recallBased: true, createdAt: new Date('2026-10-13T15:05:00Z'), disputedAt: null },
];
const objective = (id: string, name: string, target: number, owner: string | null, count = 0) => ({
  id, groundId: 'g-1', name, target, count, prevCount: 0, ownerParticipantId: owner, setByParticipantId: null,
  direction: null, isADecisionAboutAPerson: false, sortOrder: 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null,
  dueOn: new Date('2026-10-30T17:00:00Z'),
});
const run = (kindOfWork: 'sales team' | 'sales org', releaseOneSalesBoard: boolean): Setup => ({
  ...SALES_RUN,
  kindOfWork,
  releaseOneSalesBoard,
  /* Changed 18 October (Hafsah's standing decision 4): the stall rule is the lead's own, so this run has the one she set, in how we work. */
  contextItems: [{ kind: 'WAY_OF_WORKING', text: 'A deal is dropped after 3 working days with no answer from the customer.' }],
  clock: { now: NOW, endsAt: new Date('2026-10-30T17:00:00Z') },
  recordLines: LINES,
  lines: LINES,
  documents: [{ id: 'doc-mpesa', participantId: 'p-femi', fileName: 'mpesa.png', visibility: 'OWN' }],
  items: [
    item('w-kilele', 'Kilele Hotel', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-kilele', fields: { Units: '40' } }),
    item('w-wema', 'Wema', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-wema', fields: { Units: '10' } }),
    item('w-juja', 'Juja Hardware', { stage: 'Pitched', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-juja', fields: { Value: 'KES 4,500' } }),
    item('w-pima', 'Mama Pima Stores', { stage: 'Contacted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-pima' }),
  ],
  objectives: [
    /* The stored count is what was read from what was said (25): the old board shows it; the new one counts the deals. */
    objective('o-team', 'Units sold by 30 October', 120, null, 25),
    objective('o-femi', 'units sold by 30 October', 60, 'p-femi'),
  ],
  dependencies: [
    ...(SALES_RUN.dependencies ?? []),
    handoff('d-price', 'p-kwame', 'an answer about the KES 4,500 price for Juja Hardware', { onParticipantId: 'p-bisi', status: 'WAITING', createdAt: new Date('2026-10-15T12:07:00Z') }),
  ],
});
const aim = (b: any, id: string) => (b.objectives ?? []).find((o: any) => o.id === id);
const thePriceQuestion = (b: any) => (b.leadActions ?? []).find((a: any) => a.id === 'waiting-on-the-lead-d-price');

describe('the switch is read per organisation, and fails closed', () => {
  it('is off for an organisation with no row, a row saying off, or a read that fails', async () => {
    expect(await theReleaseOneSalesBoardIsOn({ organization: { findUnique: async () => null } }, 'org-1')).toBe(false);
    expect(await theReleaseOneSalesBoardIsOn({ organization: { findUnique: async () => ({ release1SalesBoardOn: false }) } }, 'org-1')).toBe(false);
    expect(await theReleaseOneSalesBoardIsOn({ organization: { findUnique: async () => { throw new Error('down'); } } }, 'org-1')).toBe(false);
    expect(await theReleaseOneSalesBoardIsOn({ organization: { findUnique: async () => ({ release1SalesBoardOn: true }) } }, null)).toBe(false);
    expect(await theReleaseOneSalesBoardIsOn({ organization: { findUnique: async () => ({ release1SalesBoardOn: true }) } }, 'org-1')).toBe(true);
  });
});

describe.each(['sales team', 'sales org'] as const)('on a "%s" check-in', (kind) => {
  describe('with Release 1\'s sales board switched on', () => {
    it('Bisi, who runs it, reads the aim counted from the deals, the price question as a decision, and the stalled deal', async () => {
      const b = await boardAs(run(kind, true), ...BISI);
      expect(b.releaseOneSalesBoard).toBe(true);
      expect(aim(b, 'o-team').count).toBe(50);
      expect(aim(b, 'o-team').fromTheDeals.says).toBe('50 sold, 40 with proof of payment.');
      /* Changed 18 October (Hafsah's quality pass, Q1): "50 of the 120 units are sold", with the deals named. */
      expect(b.headline.answer).toContain('50 of the 120 units are sold');
      expect(thePriceQuestion(b).decision.question).toBe('Decide whether to agree to the KES 4,500 price for Juja Hardware');
      expect(b.atTheStallRule?.[0]?.title).toBe('Mama Pima Stores has not answered Kwame since 12 October');
    });

    it('Femi, who checks in, reads his own sales from his own deals, and nothing that is Bisi\'s to decide', async () => {
      const b = await boardAs(run(kind, true), ...FEMI);
      expect(b.yourShare.map((s: any) => s.says)).toEqual([
        /* Changed 18 October (Hafsah's quality pass, R-5): the share names the reader's own deals and what proves each. */ 'You have sold 50 of your 60 units so far, 40 paid (Kilele Hotel) and 10 on your word (Wema).',
      ]);
      const sent = JSON.stringify(b);
      expect(sent).not.toContain('Decide whether to agree');
      expect(sent).not.toContain('The stall rule says drop');
    });

    it('Juma, an admin who only reads, is sent neither the decision nor the stalled deal', async () => {
      const b = await boardAs(run(kind, true), ...JUMA);
      const sent = JSON.stringify(b);
      expect(sent).not.toContain('Decide whether to agree');
      expect(b.atTheStallRule).toBeUndefined();
    });
  });

  describe('with Release 1\'s sales board switched off, the board reads as it did before it', () => {
    it('Bisi reads the count read from what was said, no decision on the price, no stall list, and the gap with no new heading', async () => {
      const b = await boardAs(run(kind, false), ...BISI);
      expect(b.releaseOneSalesBoard).toBe(false);
      expect(aim(b, 'o-team').count).toBe(25);
      expect(aim(b, 'o-team').fromTheDeals).toBeNull();
      expect(JSON.stringify(b)).not.toContain('with proof of payment.');
      expect(thePriceQuestion(b)?.decision).toBeUndefined();
      expect(JSON.stringify(b)).not.toContain('Decide whether to agree');
      expect(b.atTheStallRule).toBeUndefined();
      if (b.toCloseTheGap) expect('heading' in b.toCloseTheGap).toBe(false);
      /* The deals are still there: switching it off loses nothing. */
      const names = (b.workRecords ?? []).flatMap((s: any) => s.rows ?? []).map((r: any) => r.name);
      expect(names).toEqual(expect.arrayContaining(['Kilele Hotel', 'Wema', 'Juja Hardware', 'Mama Pima Stores']));
    });

    it('Femi reads his share as before, not counted from his deals', async () => {
      const b = await boardAs(run(kind, false), ...FEMI);
      const said = (b.yourShare ?? []).map((s: any) => s.says).join(' ');
      expect(said).not.toContain('You have sold');
      expect(said).not.toContain('proof of payment');
    });

    it('Kwame reads his own deals as before', async () => {
      const b = await boardAs(run(kind, false), ...KWAME);
      const names = (b.workRecords ?? []).flatMap((s: any) => s.rows ?? []).map((r: any) => r.name);
      expect(names).toEqual(expect.arrayContaining(['Juja Hardware', 'Mama Pima Stores']));
      expect(names).not.toContain('Kilele Hotel');
    });
  });
});

describe('a sales team is served the sales board a sales organisation is', () => {
  it.each([
    ['Bisi, who runs it', BISI],
    ['Femi, who checks in', FEMI],
    ['Juma, an admin who only reads', JUMA],
  ] as const)('%s reads the same board either way, but for its kind', async (_who, reader) => {
    for (const on of [true, false]) {
      const team = await boardAs(run('sales team', on), reader[0], reader[1]);
      const org = await boardAs(run('sales org', on), reader[0], reader[1]);
      expect(team.kindOfWork).toBe('sales team');
      expect(org.kindOfWork).toBe('sales org');
      expect(JSON.stringify({ ...team, kindOfWork: null, switchboard: null })).toBe(JSON.stringify({ ...org, kindOfWork: null, switchboard: null }));
    }
  });
});
