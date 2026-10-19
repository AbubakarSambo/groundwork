import { theMPesaCodeFor } from './a-deals-proof-is-about-that-deal';
import { aDealThatMoved } from '../reports/what-a-sales-week-shows';
import { withWhatHerRuleSays } from '../engagement/a-question-her-own-rule-answers';
import { howSureGroundworkIs } from '../reports/the-sales-team-report-from-the-record';

/**
 * AN M-PESA CODE GIVEN IN WORDS IS PROOF OF PAYMENT, SHOWN AS "M-PESA CODE" (Hafsah, 19 October). Drop Access, messages test, fourth run:
 * Kevin said on Tuesday 13 October "Kilele Hotel's payment was KES 200,000 via M-Pesa. The confirmation code is QJK4TL2MX9." The record
 * keeps it as typed proof. Grace's weekly letter said "Kilele Hotel bought. There is a payment record."
 */
const KEVINS_LINE = { text: "Kilele Hotel's payment was KES 200,000 via M-Pesa. The confirmation code is QJK4TL2MX9.", anchoredDocumentId: null };
const KILELE = { name: 'Kilele Hotel', fields: { Units: '40', Value: 'KES 200,000' } };

describe("Kevin's M-Pesa code for Kilele Hotel", () => {
  it('is the payment record for Kilele Hotel, and for no other deal', () => {
    expect(theMPesaCodeFor(KILELE, [KEVINS_LINE])).toBe('QJK4TL2MX9');
    expect(theMPesaCodeFor({ name: 'Savannah Cafe', fields: {} }, [KEVINS_LINE])).toBeNull();
    /* An M-Pesa message sent as a document is a document, said as before. */
    expect(theMPesaCodeFor(KILELE, [{ ...KEVINS_LINE, anchoredDocumentId: 'doc-1' }])).toBeNull();
  });
  it("Grace's weekly letter says the M-Pesa code", () => {
    expect(aDealThatMoved({ name: 'Kilele Hotel', ownerParticipantId: 'kevin', from: null, to: 'Won', won: true, paid: true, proven: true, mpesaCode: 'QJK4TL2MX9' }, () => 'Kevin')).toBe('Kilele Hotel bought. M-Pesa code QJK4TL2MX9 shows the payment.');
    expect(aDealThatMoved({ name: 'Kilele Hotel', ownerParticipantId: 'kevin', from: null, to: 'Won', won: true, paid: true, proven: true }, () => 'Kevin')).toBe('Kilele Hotel bought. There is a payment record.');
  });
  it('her rule, applied, says the M-Pesa code', () => {
    const said = withWhatHerRuleSays('Confirm if the payment confirmation for the Kilele Hotel sale meets the team\'s definition of a completed deal.', { deals: [{ name: 'Kilele Hotel', paid: true, signed: false, mpesaCode: 'QJK4TL2MX9' }] });
    expect(said).toBe('Your rule is that a sale counts only with a payment or a signed order. M-Pesa code QJK4TL2MX9 shows the payment for Kilele Hotel, so it counts.');
  });
  it('the team report says what backs it', () => {
    expect(howSureGroundworkIs([{ name: 'Kilele Hotel', paid: true, signed: false, byMPesa: false, mpesaCode: 'QJK4TL2MX9' }], 0)).toContain('Kilele Hotel, which M-Pesa code QJK4TL2MX9 backs');
  });
});
