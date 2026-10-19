import { theSalesWeekInWords } from './the-sales-week-in-words';

/**
 * "KILELE HOTEL BOUGHT. THERE IS A PAYMENT RECORD." AND "... BEFORE THERE WAS A PAYMENT OR A SIGNED ORDER" IN ONE LETTER (messages test,
 * 19 October, finding 5).
 *
 * Drop Access (test). Kevin Omondi said on Monday 12 October "Okay, so today I sold 40 units to Kilele Hotel." and "I have the M-Pesa
 * confirmation message for the Kilele Hotel payment.", and gave the code on Tuesday 13 October: "Okay, sending it now. QJK4TL2MX9."
 * Grace's weekly letter of Friday 16 October said, under what moved, "Kilele Hotel bought. There is a payment record.", and, under what
 * to do, "Kevin Omondi counted Kilele Hotel as sold on 12 October, before there was a payment or a signed order." Kevin had the payment
 * on the 12th; its record came on the 13th. The reason now says what the record holds, the day each came, and agrees with what moved.
 */
const KEVIN = 'a04ea223-8e38-4d0d-9072-a7bd6bf73059';
const GRACE = '6fc1fead-9834-4489-91dc-ad9921fd09d3';
const kilele = (paidOn: Date | null) => ({
  id: 'kilele', name: 'Kilele Hotel', stage: 'Won', ownerParticipantId: KEVIN, fields: { Units: '40' },
  firstOnRecordAt: new Date('2026-10-12T08:02:00Z'), proven: !!paidOn, paid: !!paidOn, paidOn,
  stagesKept: [{ stage: 'Won', on: '2026-10-12T08:02:00.000Z', by: 'check-in' }],
});

function forTheLead(deal: any) {
  return theSalesWeekInWords({
    people: [{ id: GRACE, label: 'Grace Achieng', isTheLead: true }, { id: KEVIN, label: 'Kevin Omondi', isTheLead: false }],
    deals: [deal], lastStage: 'Won', waits: [], lines: [], turns: [], checkIns: [], documents: [], targets: [],
    aSaleNeedsProof: true, stallDays: 3, buyingDateOf: () => null,
    start: new Date('2026-10-11T21:00:00Z'), at: new Date('2026-10-16T14:00:00Z'), zone: 'Africa/Nairobi',
  }).forTheLead;
}

describe('a sale counted before its proof says when the proof came', () => {
  it('Kilele Hotel: counted on 12 October, its payment record on 13 October, and never "before there was a payment"', () => {
    const rule = forTheLead(kilele(new Date('2026-10-13T05:03:00Z'))).find((t) => /sale counts only/.test(t.do));
    expect(rule?.why).toBe('Kevin Omondi counted Kilele Hotel as sold on 12 October, and its payment record came on 13 October.');
    expect(rule?.why).not.toContain('before there was a payment');
  });

  it('with nothing written at all, it says nothing written shows a payment or a signed order yet', () => {
    const rule = forTheLead(kilele(null)).find((t) => /sale counts only/.test(t.do));
    expect(rule?.why).toBe('Kevin Omondi counted Kilele Hotel as sold on 12 October, and nothing written shows a payment or a signed order for it yet.');
  });
});
