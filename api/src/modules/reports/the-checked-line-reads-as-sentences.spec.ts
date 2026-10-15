import { whatCouldBeChecked } from './what-nothing-here-could-check';

/**
 * Read on 1 October in the final run (re-f), by the lead on every report: "All 1 of the things
 * described here line up with something other than what the person said - what another person said,
 * a document, or a record." One thing is "the one thing", and the list is a sentence of its own,
 * never hung on a dash.
 */
const claim = (checked: boolean): any => ({ anotherAccount: false, document: checked, record: false });
const says = (n: number, checked: number) =>
  whatCouldBeChecked([...Array(checked)].map(() => claim(true)).concat([...Array(n - checked)].map(() => claim(false))), 2).says[0];

describe('the line on what could be checked reads as plain sentences', () => {
  it('one thing, checked', () => {
    expect(says(1, 1)).toBe('The one thing described here lines up with something other than what the person said. It is backed by what another person said, a document, or a record.');
  });
  it('several things, all checked: no dash', () => {
    const s = says(6, 6);
    expect(s).toBe('All 6 of the things described here line up with something other than what the person said. Each one is backed by what another person said, a document, or a record.');
    expect(s).not.toMatch(/ - /);
  });
  it('one thing, not checked', () => {
    expect(says(1, 0)).toBe('The one thing described here could not be checked against what another person said, a document, or a record from a system. It is in this report because somebody said it.');
  });
  it('some checked, one left', () => {
    expect(says(3, 2)).toBe('2 of the 3 things described here line up with something other than what the person said. The other one is in this report because somebody said it, and nothing else in the record speaks to it either way.');
  });
  it('one checked of several', () => {
    expect(says(4, 1)).toMatch(/^1 of the 4 things described here lines up with .* The other 3 are in this report because somebody said them,/);
  });
});
