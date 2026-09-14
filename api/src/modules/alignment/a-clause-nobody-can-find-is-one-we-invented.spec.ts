import { theTermsInIt, TERMS_IN_A_DOCUMENT_PROMPT } from './the-agreement-arrives-as-a-document';

const DOC = `DISTRIBUTION AGREEMENT

1. BACKGROUND
This agreement is made between Alpha Ltd and Beta Stores.

4.1 The Distributor shall pay a revenue share of twenty per cent.
4.3 The Distributor shall provide a monthly report by the tenth of each month.
9.1 Either party may terminate on ninety days written notice.

12. GOVERNING LAW
This agreement is governed by the laws of the Federal Republic of Nigeria.`;

const term = (says: string, reads = 'A plain restatement.', clause?: string) => ({ says, reads, clause });

describe('a clause nobody can find is one we invented', () => {
  it('keeps a clause quoted exactly from the document', () => {
    const out = theTermsInIt({ terms: [term('The Distributor shall pay a revenue share of twenty per cent.', 'Twenty per cent is payable as a revenue share.', '4.1')] }, DOC);
    expect(out).toHaveLength(1);
    expect(out[0].clause).toBe('4.1');
  });

  it('drops a clause that is not in the file', () => {
    const out = theTermsInIt({ terms: [term('The Distributor shall pay a revenue share of twenty-five per cent.')] }, DOC);
    expect(out).toEqual([]);
  });

  it('drops a clause that was tidied rather than copied', () => {
    const out = theTermsInIt({ terms: [term('Distributor pays a 20% revenue share.')] }, DOC);
    expect(out).toEqual([]);
  });

  it('survives a line break where the PDF put one', () => {
    const out = theTermsInIt({ terms: [term('The Distributor shall pay\n   a revenue share of twenty per cent.')] }, DOC);
    expect(out).toHaveLength(1);
  });

  it('refuses a clause reference that is prose rather than a pointer', () => {
    const out = theTermsInIt({ terms: [term('Either party may terminate on ninety days written notice.', 'Ninety days notice ends it.', 'the termination provisions of the agreement')] }, DOC);
    expect(out[0].clause).toBeNull();
  });

  it('refuses a reference with no number in it', () => {
    const out = theTermsInIt({ terms: [term('Either party may terminate on ninety days written notice.', 'x', 'Termination')] }, DOC);
    expect(out[0].clause).toBeNull();
  });

  it('drops a term with no reading, and a fragment', () => {
    expect(theTermsInIt({ terms: [term('Either party may terminate on ninety days written notice.', '')] }, DOC)).toEqual([]);
    expect(theTermsInIt({ terms: [term('shall pay')] }, DOC)).toEqual([]);
  });

  it('never returns the same clause twice', () => {
    const t = term('The Distributor shall provide a monthly report by the tenth of each month.');
    expect(theTermsInIt({ terms: [t, { ...t, clause: '4.3' }] }, DOC)).toHaveLength(1);
  });

  it('does not return a contract as forty terms', () => {
    const many = Array.from({ length: 40 }, () => term('Either party may terminate on ninety days written notice.'));
    expect(theTermsInIt({ terms: many }.terms ? { terms: many } : null, DOC).length).toBeLessThanOrEqual(20);
  });

  it('takes an empty answer', () => {
    expect(theTermsInIt({ terms: [] }, DOC)).toEqual([]);
    expect(theTermsInIt(null, DOC)).toEqual([]);
  });

  it('tells the reader that the reading is not theirs to make', () => {
    expect(TERMS_IN_A_DOCUMENT_PROMPT).toContain('YOU ARE NOT READING WHAT IT MEANS');
    expect(TERMS_IN_A_DOCUMENT_PROMPT).toContain('that silence is the most valuable thing in the document');
    expect(TERMS_IN_A_DOCUMENT_PROMPT).toContain('Ten good ones beat forty');
    expect(TERMS_IN_A_DOCUMENT_PROMPT).toContain('do not flag risk');
  });
});
