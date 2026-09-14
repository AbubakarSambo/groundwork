import { draftThePicture } from './the-picture-is-drafted-from-the-reads';

/**
 * "MARKETING ANALYST IS WAITING FOR WAITING ON SOMEONE ELSE, WITH NO ESCALATION ON RECORD."
 *
 * Read off a live run of all 23 situations: 15 of 18 blocker findings named nothing, and several
 * were not sentences. `what` is the person's own words, and where they never said what they were
 * waiting ON it is a clause - "waiting on someone else", "something", "how this connects to
 * anything" - which the template put after the word "for".
 *
 * THE ROW IS RIGHT AND THE SENTENCE IS NOT. Somebody who says "waiting on someone else, been a few
 * weeks" IS blocked, and dropping the row loses a real blocker. So the sentence changes, not the
 * record: the named things fill the list, the rest are counted and said as what they are.
 *
 * That is also the more useful line. A manager who reads "two people are stuck on something they
 * have not named" knows exactly what to ask next; "waiting for something" tells them nothing and
 * reads as a fault in the product.
 */
const base = {
  answered: 3, ofPeople: 3,
  confidence: { saying: 'Enough to go on.' } as any, tiles: [] as any[], patterns: [] as any[],
  coverage: [] as any[], contribution: [] as any[], settled: [] as string[], open: [] as string[],
};
const finding = (blockers: any[]) =>
  draftThePicture({ ...base, blockers } as any).find((d) => d.key.startsWith('block-'))?.text ?? '';

const blocker = (over: Partial<any> = {}) => ({
  who: 'Marketing analyst', on: null, onIsPerson: false,
  what: 'the finance number', kind: null, escalated: false, named: true, ...over,
});

describe('a blocker nobody named still reads as English', () => {
  it('the exact line from the run does not come back', () => {
    const text = finding([blocker({ what: 'waiting on someone else', named: false })]);
    expect(text).not.toContain('waiting for waiting on someone else');
    expect(text).not.toMatch(/waiting for waiting/);
  });

  it('and says what is actually true instead', () => {
    const text = finding([blocker({ what: 'waiting on someone else', named: false })]);
    expect(text).toContain('something they have not named');
  });

  it('a named thing is still quoted, because those are the useful ones', () => {
    expect(finding([blocker({ what: 'the finance number' })])).toContain('the finance number');
  });

  it('named and unnamed together: the named ones are said, the rest are counted', () => {
    const text = finding([
      blocker({ what: 'the finance number' }),
      blocker({ who: 'Head of Sales', what: 'something', named: false }),
      blocker({ who: 'Ada', what: 'anything at all', named: false }),
    ]);
    expect(text).toContain('the finance number');
    expect(text).toContain('2 things they have not named');
    /* And never the raw clause. */
    expect(text).not.toContain('for something');
  });

  it('a row from before the column existed is not assumed unnamed', () => {
    /*
     * `named` undefined is "we never asked", and every dependency written before the extraction
     * carried the question has it. Read as false, half the board would stop quoting anything.
     */
    const text = finding([blocker({ what: 'the sales deck', named: undefined })]);
    expect(text).toContain('the sales deck');
  });
});
