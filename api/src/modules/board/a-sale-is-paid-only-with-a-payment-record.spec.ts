import { boardAs, SALES_RUN, BISI, FEMI, KWAME, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * "WITH PROOF OF PAYMENT" COUNTS THE PAYMENT RECORD ALONE (Hafsah's point 12, 17 October; "Won: paid, or a deposit received, with
 * a payment record").
 *
 * On the test bed Grace read "71 sold, 65 with proof of payment.": Greenfield Supermarket's signed order was counted as paid,
 * while "Reported vs criteria met" said Won is met only with a payment record. One rule now: a signed order proves the order,
 * not the payment, and a sale said won in words alone is the speaker's word. Drop Access's record in the sales run's people:
 * Bisi runs it (Grace), Femi checks in (Kevin: Kilele Hotel, paid by M-Pesa, and Savannah Cafe, said won), Kwame checks in
 * (Mercy: Greenfield Supermarket, with its signed order).
 */
const at = (s: string) => new Date(s);
const NOW = at('2026-10-17T17:00:00Z');
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: at('2026-10-12T15:00:00Z'), updatedAt: at('2026-10-12T15:00:00Z'), ...more,
});
const line = (id: string, participantId: string, text: string, createdAt: string, more: Record<string, any> = {}) => ({
  id, participantId, type: 'PROGRESS', text, recallBased: true, createdAt: at(createdAt), disputedAt: null, ...more,
});
const proven = (doc: string) => ({ recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: doc });
const LINES = [
  line('e-kilele', 'p-femi', 'Kilele Hotel bought 40 units for KES 200,000. Here is the M-Pesa message.', '2026-10-12T15:03:00Z', proven('doc-mpesa')),
  line('e-savannah', 'p-femi', 'Savannah Cafe is won, 6 units for KES 30,000.', '2026-10-14T15:03:00Z'),
  line('e-green', 'p-kwame', 'Greenfield Supermarket signed the order today. Here is the photo of it.', '2026-10-13T15:05:00Z', proven('doc-order')),
];
const DOCS = [
  { id: 'doc-mpesa', groundId: 'g-1', participantId: 'p-femi', fileName: 'mpesa-kilele-hotel.txt', uploaderNote: 'The M-Pesa message for Kilele Hotel', content: 'QJK4TL2MX9 Confirmed. Ksh200,000.00 received from KILELE HOTEL LTD on 12/10/26.', visibility: 'EVERYONE' },
  { id: 'doc-order', groundId: 'g-1', participantId: 'p-kwame', fileName: 'greenfield-signed-order.txt', uploaderNote: 'The signed order from Greenfield Supermarket', content: 'GREENFIELD SUPERMARKET - PURCHASE ORDER PO-4471. Total KES 125,000. Payment on delivery. Signed: M. Njeri.', visibility: 'EVERYONE' },
];
const objective = (id: string, name: string, target: number, owner: string | null) => ({
  id, groundId: 'g-1', name, target, count: 0, prevCount: 0, ownerParticipantId: owner, setByParticipantId: null,
  direction: null, isADecisionAboutAPerson: false, sortOrder: 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null,
});
const run = (on = true): Setup => ({
  ...SALES_RUN,
  kindOfWork: 'sales team',
  releaseOneSalesBoard: on,
  clock: { now: NOW, endsAt: at('2026-10-30T17:00:00Z') },
  checkIns: [answered('p-femi', 4, '2026-10-15T15:03:00Z'), answered('p-kwame', 4, '2026-10-15T15:05:00Z')],
  lines: LINES,
  recordLines: LINES,
  documents: DOCS,
  dependencies: [],
  commitments: [],
  items: [
    item('w-kilele', 'Kilele Hotel', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-kilele', fields: { Units: '40', Value: 'KES 200,000' } }),
    item('w-savannah', 'Savannah Cafe', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-savannah', fields: { Units: '6', Value: 'KES 30,000' } }),
    item('w-green', 'Greenfield Supermarket', { stage: 'Won', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-green', fields: { Units: '25', Value: 'KES 125,000' } }),
  ],
  objectives: [
    objective('o-team', 'Units sold by 30 October', 120, null),
    objective('o-femi', 'units sold by 30 October', 40, 'p-femi'),
    objective('o-kwame', 'units sold by 30 October', 40, 'p-kwame'),
  ],
});
const aim = (b: any, id: string) => (b.objectives ?? []).find((o: any) => o.id === id);
const deal = (b: any, name: string) => (b.workRecords ?? []).flatMap((s: any) => s.rows ?? []).find((r: any) => r.name === name);
const wonLine = (b: any) => (b.reportedAgainstCriteria?.stages ?? []).filter((s: any) => s.stage === 'Won').map((s: any) => `${s.stage} ${s.reported} said, ${s.met} met`);

describe('with Release 1\'s sales board on', () => {
  /*
   * Changed 18 October (Hafsah's answer 2: "Drop Access counts a sale as Won with a signed order or a payment, both as proof. Count
   * proof of payment separately, as the kit's board does ('21 sold, 17 with proof of payment')."). Greenfield's signed order now
   * meets Won, so Won reads 2 met, not 1; "with proof of payment" still counts the payment record alone, 40.
   */
  it('Bisi reads 71 sold and 40 with proof of payment, counted apart from Won met, which a signed order meets too', async () => {
    const b = await boardAs(run(), ...BISI);
    expect(aim(b, 'o-team').fromTheDeals.says).toBe('71 sold, 40 with proof of payment.');
    /* Changed 18 October (Hafsah's quality pass, Q1 and B-3): the answer says which deals are paid and which are on a signed order. */
    expect(b.headline.answer).toBe('Not yet. 71 of the 120 units are sold. 40 are paid (Kilele Hotel), 25 are on a signed order (Greenfield Supermarket) and 6 rest on what somebody said (Savannah Cafe).');
    expect(wonLine(b)).toEqual(['Won 3 said, 2 met']);
    expect(b.atAGlance.lines.reported).toBe('Won: 3 said, 2 met');
    /* Greenfield's signed order shows the order and meets Won; it is not a payment. */
    expect(deal(b, 'Greenfield Supermarket').knownSays).toBe('Proof shows it.');
    expect(deal(b, 'Greenfield Supermarket').stagesMet).toContain('Won');
    expect(deal(b, 'Greenfield Supermarket').paymentRecord).toBe(false);
    expect(deal(b, 'Kilele Hotel').stagesMet).toContain('Won');
  });

  it('Savannah Cafe, won in words alone, reads as said', async () => {
    const b = await boardAs(run(), ...BISI);
    const grid = (b.workRecords ?? []).find((s: any) => (s.rows ?? []).some((r: any) => r.kind === 'deal'));
    const group = (grid.groups ?? []).find((g: any) => (g.rowIds ?? []).includes('w-savannah'));
    expect(group.heading).toBe('Said to be won, not shown yet');
    expect(group.reason).toBe('Somebody said each of these was won, in their own words. Nothing has been shown to back them yet, so they count in what is sold as their word, not as sales with proof of payment.');
  });

  it('Femi reads 40 of his 46 proven paid and the rest on his word; Kwame reads his 25 backed by the signed order, with no proof of payment yet', async () => {
    const f = await boardAs(run(), ...FEMI);
    expect(f.yourShare.map((s: any) => s.says)).toEqual([
      /* Changed 18 October (Hafsah's quality pass, R-5): the share names the reader's own deals and what proves each. */ /* Changed 20 October (night run 2, Kevin's 49 of 30): 46 is not a part of 40, so a passed target says by how much. */ 'You have sold 46 units so far, 6 more than your target of 40, 40 paid (Kilele Hotel) and 6 on your word (Savannah Cafe).',
    ]);
    const k = await boardAs(run(), ...KWAME);
    expect(k.yourShare.map((s: any) => s.says)).toEqual([
      /* Changed 18 October (Hafsah's quality pass, R-5): the share names the reader's own deals and what proves each. */ 'You have sold 25 of your 40 units so far, all to Greenfield Supermarket, on a signed order.',
    ]);
  });
});
