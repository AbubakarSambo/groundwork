import { boardAs, SALES_RUN, BISI, FEMI, JUMA, handoff, A_RELEASED_REPORT, type Setup } from './the-switchboards-sections-harness';
import { anArticleSaidMidSentence, holdsItSaid, aHolderInTheirOwnWords } from './a-holder-in-their-own-words';

/**
 * RUN-25, SALES: "WAITING ON THE CUSTOMERS", WITH A CAPITAL "THE" MID-SENTENCE.
 *
 * Femi said he was waiting on "The customers", and the holder was kept with its capital. Every reader of the sales
 * board then read "Femi Okonkwo is waiting on The customers for their documents" (or "You are waiting on The
 * customers ..."), "said the work was waiting on The customers" and "with The customers, and nothing on record says
 * ...", 47 times in the run. A leading article taken from stored words is said in lower case mid-sentence; a name
 * keeps its capitals.
 */
const RUN: Setup = {
  ...SALES_RUN, report: A_RELEASED_REPORT, waitsAreReadOnTheirOwn: true,
  dependencies: [
    ...SALES_RUN.dependencies!.filter((d: any) => d.id !== 'd-femi'),
    handoff('d-femi', 'p-femi', 'their documents, especially the bank statements', { onLabel: 'The customers', status: 'BLOCKING', sourceCheckInId: 'c2-p-femi', createdAt: new Date('2026-09-30T16:00:00Z') }),
  ],
};
const MID_SENTENCE_CAPITAL = /[a-z,] The customers/;
const strings = (v: any, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
};

describe('a holder that starts with "The" is said in lower case mid-sentence', () => {
  it('Bisi, who runs it, and Juma, an admin, read "waiting on the customers"', async () => {
    for (const who of [BISI, JUMA]) {
      const said = strings(await boardAs(RUN, who[0], who[1]));
      expect(said.filter((s) => MID_SENTENCE_CAPITAL.test(s))).toEqual([]);
      expect(said).toContain('Femi Okonkwo is waiting on the customers.');
      expect(said.some((s) => s.startsWith('Femi Okonkwo is waiting on the customers for their documents'))).toBe(true);
      expect(said.some((s) => s.startsWith('On 30 September, Femi Okonkwo said the work was waiting on the customers for their documents'))).toBe(true);
    }
  });

  it('Femi reads "You are waiting on the customers", and the line that opens with them keeps its capital', async () => {
    const said = strings(await boardAs(RUN, FEMI[0], FEMI[1]));
    expect(said.filter((s) => MID_SENTENCE_CAPITAL.test(s))).toEqual([]);
    expect(said).toContain('You are waiting on the customers.');
    expect(said.some((s) => /sits outside this check-in, with the customers, and nothing on record says anybody has chased it/.test(s))).toBe(true);
    expect(said).toContain('The customers hold it.');
  });

  it('a name keeps its capitals', () => {
    expect(anArticleSaidMidSentence('The customers')).toBe('the customers');
    expect(anArticleSaidMidSentence('A supplier in Kano')).toBe('a supplier in Kano');
    expect(anArticleSaidMidSentence('The Gambia office')).toBe('The Gambia office');
    expect(anArticleSaidMidSentence('The Body Shop')).toBe('The Body Shop');
    expect(anArticleSaidMidSentence('Theo')).toBe('Theo');
    expect(aHolderInTheirOwnWords('The credit committee', false)).toBe('the credit committee');
    expect(holdsItSaid('the credit committee')).toBe('The credit committee holds it.');
  });
});
