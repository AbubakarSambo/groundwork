import { proofNamesTheDeal, theSameCustomer, aLineNamesTheCustomer } from './one-deal-per-customer';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * PILOTS AFTER FIXES, 14 OCTOBER (A3): Kevin's M-Pesa ("Ksh496,000.00 received from KILELE HOTEL LTD") was read correctly,
 * but it was put under Grace's line "Kevin sold Kilele 40 units, paid", so no line was the speaker's own document and Kilele
 * read "Said to be won, not shown yet" for five days.
 */
describe('Kevin\'s M-Pesa shows the Kilele deal', () => {
  const LINES = [
    { text: 'Kevin sold Kilele 40 units, paid', mark: 'said', documentBy: 'p-kevin' },
    { text: 'Proof of payment. The M-Pesa message from Kilele.', mark: 'said', documentBy: 'p-kevin' },
  ];
  it('a line naming the customer, backed by the deal owner\'s own document, shows the deal whoever said the line', () => {
    expect(proofNamesTheDeal('Kilele', LINES, 'p-kevin')).toBe(true);
    expect(proofNamesTheDeal('Kilele Hotel', LINES, 'p-kevin')).toBe(true);
  });
  it('somebody else\'s document does not prove Kevin\'s deal, and nothing proves it without a document', () => {
    expect(proofNamesTheDeal('Kilele', LINES.map((l) => ({ ...l, documentBy: 'p-grace' })), 'p-kevin')).toBe(false);
    expect(proofNamesTheDeal('Kilele', LINES.map((l) => ({ ...l, documentBy: null })), 'p-kevin')).toBe(false);
  });
  it('the payer as the M-Pesa names it is the same customer', () => {
    expect(theSameCustomer('KILELE HOTEL LTD', 'Kilele Hotel')).toBe(true);
    expect(aLineNamesTheCustomer('Ksh496,000.00 received from KILELE HOTEL LTD', 'Kilele Hotel Ltd')).toBe(true);
  });
  it('the board passes the deal\'s owner and who added each backing document', () => {
    const src = readFileSync(join(__dirname, 'board.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toMatch(/proofNamesTheDeal\(r\.name, readable, r\.ownerParticipantId \?\? null\)/);
    expect(src).toMatch(/documentBy: l\.anchoredDocumentId \? \(whoAddedEach\.get\(l\.anchoredDocumentId\) \?\? null\) : null/);
  });
});
