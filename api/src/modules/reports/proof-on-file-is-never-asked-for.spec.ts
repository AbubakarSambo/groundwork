import { theSalesAndTheirProof, whatIsOnFileForEachSale, withoutAsksForProofOnFile } from './proof-on-file-is-never-asked-for';

/**
 * Grace's board on the evening of Monday 12 October, in the engine test's second run. Kevin had sent the Kilele Hotel M-Pesa message
 * ("QJK4TL2MX9 Confirmed. Ksh200,000.00 received from KILELE HOTEL LTD") in his check-in that morning, and the board marked his line
 * proven. The judgement's lines below are the ones she was served, word for word.
 */
const KEVIN = 'p-kevin';
const JOSEPH = 'p-joseph';
const deals: any[] = [
  { id: 'w-kilele', name: 'Kilele Hotel', stage: 'Won', ownerParticipantId: KEVIN, fields: { Units: '40', Value: 'KES 200,000' }, firstOnRecordAt: new Date('2026-10-12T11:05:14Z'), proven: true, paid: true, signed: false },
  { id: 'w-pima', name: 'Mama Pima Stores', stage: 'Won', ownerParticipantId: JOSEPH, fields: { Units: '10' }, firstOnRecordAt: new Date('2026-10-12T11:10:00Z'), proven: false, paid: false, signed: false },
  { id: 'w-savannah', name: 'Savannah Cafe', stage: 'Pitched', ownerParticipantId: KEVIN, fields: {}, firstOnRecordAt: new Date('2026-10-12T11:05:14Z'), proven: false, paid: false, signed: false },
];
const mondaysJudgement = {
  theGap: "Your standard for a 'sold' unit is not what everyone is using, so your view of progress towards the 120-unit target is wrong.",
  whatToDo: [
    { move: 'State to the whole team that a sale is only counted if there is proof of payment or a signed order.', because: "Joseph Kariuki is counting a deal as 'basically closed' that does not meet this standard.", startWith: 'Joseph Kariuki' },
    { move: 'Ask Kevin Omondi for the document showing a signed order or proof of payment for the 40-unit Kilele Hotel order.', because: "Kevin Omondi reports this order is for 40 units, which would be a third of the entire team's goal.", startWith: 'Kevin Omondi' },
    { move: "Ask Peter Njoroge what Peter's individual sales target is.", because: "Peter Njoroge's account mentions the team's 120-unit goal but not an individual target of 30 units.", startWith: 'Peter Njoroge' },
  ],
  whatThisCannotTellYou: [
    { why: 'The record shows that Kevin Omondi reported the order and provided a document, but not whether payment has been made or an order signed.', about: 'This check-in cannot tell you whether the 40-unit Kilele Hotel order from Kevin Omondi is final.', toKnow: 'You would have to see the proof of payment or signed order.' },
  ],
};
const who = (pid: string | null) => (pid === KEVIN ? 'Kevin Omondi' : pid === JOSEPH ? 'Joseph Kariuki' : null);

describe("What Grace's judgement is given about each sale, and what she is served", () => {
  const sales = theSalesAndTheirProof(deals);

  it('is told the Kilele Hotel payment record is on file, and that Mama Pima Stores has nothing written', () => {
    const block = whatIsOnFileForEachSale(sales, who);
    expect(block).toContain('Kilele Hotel, a sale Kevin Omondi said was made: a payment record for it is on file. Do not ask for its proof, and do not say its payment cannot be known.');
    expect(block).toContain('Mama Pima Stores, a sale Joseph Kariuki said was made: nothing written is on file for it, only what was said.');
    expect(block).not.toContain('Savannah Cafe');
  });

  it('is never told to ask Kevin for the Kilele Hotel proof he already sent', () => {
    const served = withoutAsksForProofOnFile(mondaysJudgement, sales).judgement;
    const moves = served.whatToDo.map((x: any) => x.move);
    expect(moves).not.toContain('Ask Kevin Omondi for the document showing a signed order or proof of payment for the 40-unit Kilele Hotel order.');
    expect(served.whatThisCannotTellYou).toEqual([]);
  });

  it("keeps the rule about Joseph's unproven deal and the question for Peter", () => {
    const moves = withoutAsksForProofOnFile(mondaysJudgement, sales).judgement.whatToDo.map((x: any) => x.move);
    expect(moves).toEqual([
      'State to the whole team that a sale is only counted if there is proof of payment or a signed order.',
      "Ask Peter Njoroge what Peter's individual sales target is.",
    ]);
  });

  it("still asks for Joseph's proof, which is not on file", () => {
    const j = { whatToDo: [{ move: 'Ask Joseph Kariuki for the M-Pesa message or signed order for the Mama Pima Stores deal.' }] };
    expect(withoutAsksForProofOnFile(j, sales).judgement.whatToDo).toHaveLength(1);
  });

  it('with no payment on file anywhere, changes nothing', () => {
    expect(withoutAsksForProofOnFile(mondaysJudgement, theSalesAndTheirProof(deals.map((d) => ({ ...d, paid: false })))).judgement).toEqual(mondaysJudgement);
  });
});
