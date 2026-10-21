import { boardAs, SALES_RUN, BISI, commitment } from './the-switchboards-sections-harness';

/**
 * A WAIT IS CLEARED, AND PROVEN, ONLY BY THE PEOPLE IN IT (Drop Access, 16 October 2026). On Grace's board, Mercy's wait for
 * "her two units" from Mama Mboga Mart read "Would clear it: Kevin Omondi committed to follow up with Jane tomorrow", and
 * Mercy's "delivery for the 25 units" read "A document backs what Kevin Omondi said about it", because the lead may read
 * everybody and Kevin's words shared a word with the wait. Read as the lead, who reads everything.
 */
const SETUP = {
  ...SALES_RUN,
  commitments: [
    ...SALES_RUN.commitments!,
    commitment('k-femi-2', 'p-femi', 'I will push for a credit decision date on my own files this week.', { statedInSession: 2, saidWordForWord: true, createdAt: new Date('2026-09-16T16:30:00Z') }),
  ],
};

describe('a wait is cleared only by the people in it', () => {
  it("Femi's promise about his own files is never what would clear Ngozi's wait", async () => {
    const b = await boardAs(SETUP as any, ...BISI);
    const ngozi = (b.blockers as any[]).find((x) => x.name === 'a date for the credit decision');
    expect(ngozi.wouldClearIt).toBeNull();
    expect(ngozi.wouldClearItSays).toBe('Nobody has said what would clear it yet.');
    expect(JSON.stringify(ngozi)).not.toMatch(/Femi/);
  });
});
