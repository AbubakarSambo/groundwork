import {
  whatCouldBeChecked, wasChecked, AClaim,
  NOBODY_TO_CHECK_AGAINST, UNCHECKED_IS_NOT_DOUBTED,
} from './what-nothing-here-could-check';

const claim = (over: Partial<AClaim> = {}): AClaim => ({
  what: 'three proposals out by the end of October',
  anotherAccount: false, document: false, record: false, ...over,
});

describe('what counts as a claim having been checked', () => {
  it('one corroborating source is the bar, and any of the three counts', () => {
    expect(wasChecked(claim({ anotherAccount: true }))).toBe(true);
    expect(wasChecked(claim({ document: true }))).toBe(true);
    expect(wasChecked(claim({ record: true }))).toBe(true);
    expect(wasChecked(claim())).toBe(false);
  });

  it('has no way for detail, confidence or session count to count as corroboration', () => {
    /*
     * The mistake this file exists to stop. Those describe the TELLING, not the thing told, and a
     * long confident answer given four times is still one person's account. Asserted on the shape:
     * there is nowhere to put such a signal.
     */
    expect(Object.keys(claim()).sort()).toEqual(['anotherAccount', 'document', 'record', 'what'].sort());
  });
});

describe('a caveat that says something different depending on what is true', () => {
  it('says nothing at all when there are no claims to say it about', () => {
    expect(whatCouldBeChecked([], 2).says).toEqual([]);
  });

  it('names both halves in one sentence in the ordinary case', () => {
    const out = whatCouldBeChecked([claim({ document: true }), claim(), claim()], 1);
    expect(out.checked).toBe(1);
    expect(out.total).toBe(3);
    expect(out.says[0]).toContain('1 of the 3');
    /* Neither half can be read on its own. */
    expect(out.says[0]).toMatch(/lines? up with something other than what the person said/);
    expect(out.says[0]).toContain('because somebody said');
  });

  it('says plainly when nothing at all was checked', () => {
    const out = whatCouldBeChecked([claim(), claim()], 1);
    expect(out.says[0]).toContain('None of the 2');
    expect(out.says[0]).toContain('because somebody said them');
  });

  it('and says so when everything was', () => {
    const out = whatCouldBeChecked([claim({ record: true }), claim({ anotherAccount: true })], 1);
    expect(out.says[0]).toContain('All 2');
  });

  it('distinguishes weak corroboration from corroboration never being possible', () => {
    /*
     * A one-party ground is not a report that checked badly. It is one where checking was never
     * available, and a reader told the second reads the whole thing differently - correctly.
     */
    const alone = whatCouldBeChecked([claim()], 0);
    expect(alone.says[0]).toBe(NOBODY_TO_CHECK_AGAINST);
    const withOthers = whatCouldBeChecked([claim()], 2);
    expect(withOthers.says).not.toContain(NOBODY_TO_CHECK_AGAINST);
  });

  it('never lets unchecked be read as doubted, in any of the cases', () => {
    for (const claims of [[claim()], [claim({ document: true })], [claim(), claim({ record: true })]]) {
      const out = whatCouldBeChecked(claims, 1);
      expect(out.says[out.says.length - 1]).toBe(UNCHECKED_IS_NOT_DOUBTED);
    }
    expect(UNCHECKED_IS_NOT_DOUBTED).toContain('does not make something wrong');
    expect(UNCHECKED_IS_NOT_DOUBTED).toContain('hold it more lightly');
  });

  it('counts claims and never a person', () => {
    const out = whatCouldBeChecked([claim({ document: true }), claim()], 1);
    const all = out.says.join(' ');
    /* "You corroborated 33 percent" is a score, and there is no version of it that is not one. */
    expect(all).not.toMatch(/%|percent/);
    expect(all).not.toMatch(/\byou\b/i);
    expect(all).not.toMatch(/score|rating|rank/i);
  });
});
