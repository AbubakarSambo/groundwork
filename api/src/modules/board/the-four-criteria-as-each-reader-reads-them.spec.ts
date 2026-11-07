import { boardAs, SALES_RUN, BISI, FEMI, KWAME, answered, type Setup } from './the-switchboards-sections-harness';

/**
 * THE FOUR CRITERIA, THE STAGE RULES AND THE PRICE-RANGE QUESTION, AS EACH READER READS THEM (Hafsah's answer to Needs Hafsah 7,
 * 17 October; docs/switchboard.md, "Stage rules and the four criteria"; the kit's board-as-lead.txt).
 *
 * Drop Access's record in the sales run's people: Bisi runs it (Grace), Femi checks in (Kevin: Kasarani Gym, Savannah Cafe and
 * Kilele Hotel), Kwame checks in (Mercy: Tuskys Westgate and Greenfield Supermarket), Juma is an admin who only reads.
 */
const NOW = new Date('2026-10-15T17:00:00Z');
const JUMA = ['u-juma', 'ADMIN'] as const;
const at = (s: string) => new Date(s);
const item = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: at('2026-10-12T15:00:00Z'), updatedAt: at('2026-10-12T15:00:00Z'), ...more,
});
const line = (id: string, participantId: string, text: string, createdAt: string, more: Record<string, any> = {}) => ({
  id, participantId, type: 'PROGRESS', text, recallBased: true, createdAt: at(createdAt), disputedAt: null, ...more,
});
const proven = (doc: string) => ({ recallBased: false, anchoredOrigin: 'photo', anchoredDocumentId: doc });
const LINES = [
  line('e-kasarani', 'p-femi', 'I visited Kasarani Gym today. Faith confirmed they need 3 units and have KES 15,000 for it, but the owner decides.', '2026-10-15T15:03:00Z'),
  line('e-savannah', 'p-femi', 'Savannah Cafe: Jane said yes to 6 units for KES 30,000, and she will buy on 23 October.', '2026-10-14T15:03:00Z'),
  line('e-kilele', 'p-femi', 'Kilele Hotel bought 40 units for KES 200,000. Here is the M-Pesa message.', '2026-10-12T15:03:00Z', proven('doc-mpesa')),
  line('e-green', 'p-kwame', 'Greenfield Supermarket signed the order today. Here is the photo of it.', '2026-10-13T15:05:00Z', proven('doc-order')),
  line('e-tuskys', 'p-kwame', 'Peter at Tuskys Westgate liked the samples. Their budget is KES 120,000 to 150,000, and he decides by 28 October.', '2026-10-15T15:05:00Z'),
];
const DOCS = [
  { id: 'doc-mpesa', groundId: 'g-1', participantId: 'p-femi', fileName: 'mpesa-kilele-hotel.txt', uploaderNote: 'The M-Pesa message for Kilele Hotel', content: 'QJK4TL2MX9 Confirmed. Ksh200,000.00 received from KILELE HOTEL LTD on 12/10/26.', visibility: 'EVERYONE' },
  { id: 'doc-order', groundId: 'g-1', participantId: 'p-kwame', fileName: 'greenfield-signed-order.txt', uploaderNote: 'The signed order from Greenfield Supermarket', content: 'GREENFIELD SUPERMARKET - PURCHASE ORDER PO-4471. Total KES 125,000. Payment on delivery. Signed: M. Njeri.', visibility: 'EVERYONE' },
];
const ITEMS = [
  item('w-kasarani', 'Kasarani Gym', { stage: 'Need established', ownerParticipantId: 'p-femi', sourceEntryId: 'e-kasarani', fields: { Units: '3', Contact: 'Faith', Need: '3 units for the members\' area', 'Budget stated': 'KES 15,000', 'Decision maker': 'the owner' } }),
  item('w-savannah', 'Savannah Cafe', { stage: 'Quoted', ownerParticipantId: 'p-femi', sourceEntryId: 'e-savannah', fields: { Units: '6', Value: 'KES 30,000', Contact: 'Jane', Need: '6 units for the cafe', 'Budget stated': 'KES 30,000', 'Decision maker': 'Jane, the owner', 'Buying date': '2026-10-23' } }),
  item('w-kilele', 'Kilele Hotel', { stage: 'Won', ownerParticipantId: 'p-femi', sourceEntryId: 'e-kilele', fields: { Units: '40', Value: 'KES 200,000' } }),
  item('w-green', 'Greenfield Supermarket', { stage: 'Won', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-green', fields: { Units: '25', Value: 'KES 125,000' } }),
  item('w-tuskys', 'Tuskys Westgate', { stage: 'Contacted', ownerParticipantId: 'p-kwame', sourceEntryId: 'e-tuskys', fields: { Contact: 'Peter', Need: 'to see samples first, then 30 units', 'Budget stated': 'KES 120,000 to 150,000', 'Decision maker': 'Peter, the buyer', 'Buying date': '2026-10-28' } }),
];
const run = (on: boolean, more: Partial<Setup> = {}): Setup => ({
  ...SALES_RUN,
  kindOfWork: 'sales team',
  releaseOneSalesBoard: on,
  clock: { now: NOW, endsAt: at('2026-10-30T17:00:00Z') },
  checkIns: [answered('p-femi', 4, '2026-10-15T15:03:00Z'), answered('p-kwame', 4, '2026-10-15T15:05:00Z')],
  lines: LINES,
  recordLines: LINES,
  documents: DOCS,
  items: ITEMS,
  dependencies: [],
  commitments: [],
  ...more,
});
const deal = (b: any, name: string) => (b.workRecords ?? []).flatMap((s: any) => s.rows ?? []).find((r: any) => r.name === name);
const grid = (b: any) => (b.workRecords ?? []).find((s: any) => (s.rows ?? []).some((r: any) => r.kind === 'deal'));
/* What a person reads under the opened deal, line by line, as the page draws it ("✓ Need", "○ Buying date. Not on record yet."). */
const ticks = (r: any) => (r?.criteria ?? []).map((c: any) => `${c.met ? '✓' : '○'} ${c.label}${!c.met && c.says ? `. ${c.says}` : ''}`);
/* Changed 18 October (Hafsah's quality pass, B-23): a stage nobody reported a deal at reads only how many meet it, as the kit's "Pitched 49 met". */
const stageLines = (b: any) => (b.reportedAgainstCriteria?.stages ?? []).map((s: any) => (s.reported == null ? `${s.stage} ${s.met} met` : `${s.stage} ${s.reported} said, ${s.met} met`));
const theRangeQuestion = (b: any) => (b.leadActions ?? []).find((a: any) => a?.decision?.question === 'Decide whether a price range counts as a budget');

describe('with Release 1\'s sales board on', () => {
  it('Bisi opens Kasarani Gym and reads three criteria ticked and the buying date not on record, and Femi reads the same deal state', async () => {
    const lead = deal(await boardAs(run(true), ...BISI), 'Kasarani Gym');
    const rep = deal(await boardAs(run(true), ...FEMI), 'Kasarani Gym');
    expect(ticks(lead)).toEqual([
      '✓ Need',
      '✓ Budget the customer stated',
      '✓ Decision maker',
      '○ Buying date. Not on record yet.',
    ]);
    expect(lead.groupSays).toBe('Three of the four criteria are on record. The buying date is not on record yet. It was last spoken about on 15 October. No next step is booked.');
    for (const k of ['criteria', 'criteriaSays', 'stagesMet', 'stageMet', 'group', 'groupSays']) expect(rep[k]).toEqual(lead[k]);
    expect(lead.stageMet).toBe('Need established');
    expect(lead.group).toBe('possible');
  });

  it('Savannah Cafe has all four on record, a buying date before the end and word this week, so it is Likely by 30 October', async () => {
    const b = await boardAs(run(true), ...BISI);
    const r = deal(b, 'Savannah Cafe');
    expect(ticks(r)).toEqual(['✓ Need', '✓ Budget the customer stated', '✓ Decision maker', '✓ Buying date']);
    expect(r.groupSays).toBe('All four criteria are on record. The customer said they will buy on 23 October. It was last spoken about on 14 October. No next step is booked.');
    expect(r.group).toBe('likely');
    /* Said to be quoted, with no photo of the quote or the sent email: Quoted is said, not met. */
    expect(r.stagesMet).toEqual(['Contacted', 'Need established', 'Pitched', 'Qualified']);
    const likely = grid(b).groups.find((g: any) => g.group === 'likely');
    expect(likely.heading).toBe('Likely by 30 October');
    expect(likely.reason).toBe('Each of these has all four criteria on record or close, a buying date on or before 30 October, and word about it in the last week.');
    expect(grid(b).groups.find((g: any) => g.group === 'possible').reason)
      .toBe('Each of these is moving, but is missing a criterion, a buying date on or before 30 October, or word about it in the last week.');
  });

  /*
   * Changed 18 October (Hafsah's answer 2): "Drop Access counts a sale as Won with a signed order or a payment, both as proof.
   * Count proof of payment separately." This said Greenfield's signed order did not meet Won.
   */
  it('Won is met with a signed order or a payment: Kilele Hotel\'s M-Pesa message and Greenfield\'s signed order both meet it', async () => {
    const b = await boardAs(run(true), ...BISI);
    expect(deal(b, 'Kilele Hotel').stagesMet).toContain('Won');
    expect(deal(b, 'Greenfield Supermarket').stagesMet).toContain('Won');
    expect(deal(b, 'Greenfield Supermarket').stageMet).toBe('Won');
    /* And proof of payment is counted apart: the signed order is not a payment, until the bank slip. */
    expect(deal(b, 'Greenfield Supermarket').paymentRecord).toBe(false);
    expect(deal(b, 'Greenfield Supermarket').signedOrder).toBe(true);
  });

  it('Mercy\'s Greenfield has proof of payment once the bank\'s remittance slip is added, and Kwame reads the same deal', async () => {
    const slip = { id: 'doc-slip', groundId: 'g-1', participantId: 'p-kwame', fileName: 'greenfield-remittance-slip.txt', uploaderNote: 'That slip confirms Greenfield Supermarket paid KES 125,000 for the 25 units.', content: 'EQUITY BANK - REMITTANCE ADVICE. From: Greenfield Supermarket Ltd. To: Drop Access Ltd. Amount: KES 125,000.00. Value date: 16/10/2026. Reference: PO-4471, 25 water dispensers.', visibility: 'EVERYONE' };
    const paid = line('e-green-paid', 'p-kwame', 'Greenfield Supermarket paid KES 125,000 for the 25 units. Here is the remittance slip.', '2026-10-15T15:06:00Z', proven('doc-slip'));
    const setup = run(true, { documents: [...DOCS, slip], lines: [...LINES, paid], recordLines: [...LINES, paid] });
    const lead = deal(await boardAs(setup, ...BISI), 'Greenfield Supermarket');
    const rep = deal(await boardAs(setup, ...KWAME), 'Greenfield Supermarket');
    expect(lead.stageMet).toBe('Won');
    expect(lead.paymentRecord).toBe(true);
    expect(rep.stageMet).toBe('Won');
    expect(rep.paymentRecord).toBe(true);
  });

  it('a payment proven by a reference typed in full, with no document, is a payment record too', async () => {
    const typed = LINES.map((l) => (l.id === 'e-kilele' ? { ...l, text: 'The payment for Kilele Hotel was KES 200,000 by M-Pesa, confirmation code QJK4TL2MX9.', recallBased: false, anchoredOrigin: 'typed', anchoredDocumentId: null } : l));
    const b = await boardAs(run(true, { lines: typed, recordLines: typed }), ...BISI);
    expect(deal(b, 'Kilele Hotel').stagesMet).toContain('Won');
  });

  it('Bisi reads "Reported vs criteria met" counted from the rules, said and met, and no line saying the rules are not on record', async () => {
    const b = await boardAs(run(true), ...BISI);
    expect(stageLines(b)).toEqual([
      'Contacted 5 said, 5 met',
      /* Changed 18 October (Hafsah's quality pass, B-14): the units a customer wants are their need, so Kilele's 40 units meet it. */
      'Need established 4 said, 4 met',
      /* Changed 18 October (B-23): nobody reported a deal at this stage, so only how many meet it. */ 'Pitched 1 met',
      'Qualified 1 met',
      'Quoted 3 said, 2 met',
      /* Changed 18 October (answer 2): Greenfield's signed order meets Won, so 2 met, not 1. */
      'Won 2 said, 2 met',
    ]);
    expect(b.reportedAgainstCriteria.stages.find((s: any) => s.stage === 'Won').says).toBe('2 deals were reported at Won or later, and 2 deals meet what Won needs.');
    expect(b.reportedAgainstCriteria.why).toBe('Each stage counts the deals people reported at it or later, and how many of them meet what that stage needs, from the record. Won is met with a signed order or a payment record.');
    expect(JSON.stringify(b)).not.toContain('Nothing on record says what a deal must show at each stage');
  });

  it('Femi reads "Reported vs criteria met" from his own deals only', async () => {
    const b = await boardAs(run(true), ...FEMI);
    expect(stageLines(b)).toEqual([
      /* Changed 18 October (B-23): nobody reported a deal at this stage, so only how many meet it. */ 'Contacted 3 met',
      /* Changed 18 October (Hafsah's quality pass, B-14): the units a customer wants are their need. */
      'Need established 3 said, 3 met',
      'Pitched 1 met',
      'Qualified 1 met',
      'Quoted 2 said, 1 met',
      'Won 1 said, 1 met',
    ]);
    expect(JSON.stringify(b.workRecords)).not.toMatch(/Tuskys|Greenfield/);
  });

  it('Bisi reads "Decide whether a price range counts as a budget" with who raised it, what it decides, and "Yes, it counts" and "No"', async () => {
    const b = await boardAs(run(true), ...BISI);
    const q = theRangeQuestion(b);
    expect(q.decision.why).toBe('Kwame raised it. It decides whether 1 deal counts as qualified.');
    expect(q.action.choices.map((c: any) => c.label)).toEqual(['Yes, it counts', 'No']);
    expect(q.action.choices[0].route).toEqual({ method: 'POST', path: '/grounds/g-1/board/price-range/answer', body: { yes: true } });
    expect(ticks(deal(b, 'Tuskys Westgate'))).toEqual([
      '✓ Need',
      '○ Budget the customer stated. The customer gave a price range, KES 120,000 to 150,000. You have not decided yet whether a price range counts as a budget.',
      '✓ Decision maker',
      '✓ Buying date',
    ]);
    /* A range not decided yet is close, not met. */
    expect(deal(b, 'Tuskys Westgate').stagesMet).not.toContain('Qualified');
    expect(deal(b, 'Tuskys Westgate').group).toBe('likely');
  });

  it('Kwame reads his own Tuskys Westgate with the range unticked and Bisi named, and nobody but Bisi is sent the question', async () => {
    const kwame = await boardAs(run(true), ...KWAME);
    expect(ticks(deal(kwame, 'Tuskys Westgate'))[1])
      .toBe('○ Budget the customer stated. The customer gave a price range, KES 120,000 to 150,000. Bisi has not decided yet whether a price range counts as a budget.');
    for (const reader of [KWAME, FEMI, JUMA] as const) {
      const b = await boardAs(run(true), reader[0], reader[1]);
      expect(theRangeQuestion(b)).toBeUndefined();
      expect(JSON.stringify(b.leadActions ?? [])).not.toContain('price range');
    }
  });

  it('once Bisi says yes, the question is gone, the range is ticked and Tuskys Westgate meets Qualified', async () => {
    const yes = run(true, { contextItems: [{ kind: 'WAY_OF_WORKING', text: 'On whether a price range counts as a budget, the answer is yes.' }] });
    const b = await boardAs(yes, ...BISI);
    expect(theRangeQuestion(b)).toBeUndefined();
    expect(ticks(deal(b, 'Tuskys Westgate'))[1]).toBe('✓ Budget the customer stated');
    expect(deal(b, 'Tuskys Westgate').stagesMet).toContain('Qualified');
    expect(stageLines(b)).toContain('Qualified 2 met');
    expect(ticks(deal(await boardAs(yes, ...KWAME), 'Tuskys Westgate'))[1]).toBe('✓ Budget the customer stated');
  });

  it('once Bisi says no, the range stays unticked and says so, and Tuskys Westgate is no longer close', async () => {
    const no = run(true, { contextItems: [{ kind: 'WAY_OF_WORKING', text: 'On whether a price range counts as a budget, the answer is no.' }] });
    const b = await boardAs(no, ...BISI);
    expect(theRangeQuestion(b)).toBeUndefined();
    expect(ticks(deal(b, 'Tuskys Westgate'))[1]).toBe('○ Budget the customer stated. The customer gave a price range, KES 120,000 to 150,000, and a price range does not count as a budget here.');
    expect(deal(b, 'Tuskys Westgate').group).toBe('possible');
  });

  it('where no deal has a budget said as a range, Bisi is not asked about a price range at all', async () => {
    const b = await boardAs(run(true, { items: ITEMS.filter((i) => i.name !== 'Tuskys Westgate') }), ...BISI);
    expect(theRangeQuestion(b)).toBeUndefined();
    expect(JSON.stringify(b)).not.toContain('Decide whether a price range counts as a budget');
  });
});

describe('with Release 1\'s sales board off', () => {
  it('nobody reads the four criteria, the price-range question or the said-and-met counts, and the board reads as it did', async () => {
    for (const reader of [BISI, FEMI, KWAME] as const) {
      const said = JSON.stringify(await boardAs(run(false), reader[0], reader[1]));
      expect(said).not.toContain('"criteria":');
      expect(said).not.toContain('Decide whether a price range counts as a budget');
      expect(said).not.toContain('"met":');
    }
    const lead = await boardAs(run(false), ...BISI);
    /* UPDATED (Hafsah's rule of 4 November 2026, no explainer lines; batch 1 group 10, 301ec880c): the note that said no group checks a
       criterion explained the grid, so it went. The board still says no criterion, which the lines above check. */
    expect(grid(lead).groupsNote).not.toContain('Nothing on record says what a deal must show at each stage, so no group here says whether a criterion is met.');
  });
});
