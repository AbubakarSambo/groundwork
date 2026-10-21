import { withoutAsksForProofOnFile, whatIsOnFileForEachSale } from './proof-on-file-is-never-asked-for';

/**
 * PROOF ON FILE IS NEVER SAID TO BE MISSING (final real-model check: the one synthesis of Drop Access's report made again after items 12 and
 * 13). The lines are the model's, from that synthesis on gw_final_recheck, with Kilele Hotel's payment record on file.
 */
const SALES = [
  { name: 'Kilele Hotel', ownerParticipantId: 'p-kevin', paid: true, signed: false, proven: true },
  { name: 'Savannah Cafe', ownerParticipantId: 'p-kevin', paid: true, signed: false, proven: true, deposit: { paid: 15000, of: 30000, currency: 'KES' } },
  { name: 'Mama Pima Stores', ownerParticipantId: 'p-joseph', paid: false, signed: false, proven: false },
];
const whoIs = (pid: string | null) => ({ 'p-kevin': 'Participant A', 'p-joseph': 'Participant C' } as Record<string, string>)[pid ?? ''] ?? null;

describe('a line that says proof on file is missing', () => {
  it('is left out, and a true line stays', () => {
    const judgement = {
      whatTheNumbersSay: [
        { says: 'Participant A has one proven sale with Savannah Cafe, and counts a second sale at Kilele Hotel for which there is no proof of payment on file.', soWhat: 'This means Participant A is generating business but does not count sales in the same way as the initiator.' },
        { says: 'Juja Hardware is waiting for a price from Participant C.', soWhat: 'This means a sale is waiting on an action from Participant C.' },
      ],
      whatToDo: [
        { move: 'Settle with Participant A and Participant C what is required to count a sale.', because: 'Participant A and Participant C have each counted a sale that does not have a signed order or proof of payment on file.' },
        { move: 'Ask Participant C for proof of the Mama Pima Stores sale.', because: 'Nothing written is on file for Mama Pima Stores.' },
      ],
    };
    const out = withoutAsksForProofOnFile(judgement, SALES, whoIs);
    expect(out.judgement.whatTheNumbersSay.map((x: any) => x.says)).toEqual(['Juja Hardware is waiting for a price from Participant C.']);
    expect(out.judgement.whatToDo.map((x: any) => x.move)).toEqual(['Ask Participant C for proof of the Mama Pima Stores sale.']);
  });
  it('and the judgement is told a deposit is a deposit', () => {
    const said = whatIsOnFileForEachSale(SALES, whoIs);
    expect(said).toContain('Savannah Cafe, a sale Participant A said was made: a payment record for a deposit is on file, KES 15,000 of KES 30,000. It is sold on a deposit and not paid in full.');
  });
});

describe('and nowhere else in the judgement', () => {
  it('"There is no payment record or signed order on file for either sale." about Participant A and Participant C is left out', () => {
    const judgement = {
      theGap: 'Participant B reports that the price is a hurdle. Participant A has no proof of payment on file for Kilele Hotel.',
      whatThisCannotTellYou: [{ why: 'There is no payment record or signed order on file for either sale.', about: '', toKnow: 'Ask Participant A and Participant C for written proof of each sale.' }],
    };
    const out = withoutAsksForProofOnFile(judgement, SALES, whoIs);
    expect(out.judgement.whatThisCannotTellYou).toEqual([]);
    expect(out.judgement.theGap).toBe('Participant B reports that the price is a hurdle.');
  });
});
