import { theFullerPromise, nameTwoDifferentDates } from './the-same-promise-said-more-fully';

/**
 * THE SAME PROMISE WITH A DATE PUSHED INTO THE MIDDLE (screens request 154, item 6).
 *
 * The You board showed these as two promises:
 *
 *   Ask the warehouse to load my van by 7am
 *   Ask the warehouse on Tuesday 29 September to load my van by 7am.
 *
 * Request 96's rule asks for the short promise to sit WHOLE inside the long one, and a date in the
 * middle breaks that however alike they are. The containment is tested with dates taken out of
 * both now - and only the containment: two promises naming two DIFFERENT dates are still two.
 */
describe('a date in the middle does not make it a second promise', () => {
  it('merges the pair the screens actually saw, keeping the fuller words', () => {
    const short = { text: 'Ask the warehouse to load my van by 7am' };
    const full = { text: 'Ask the warehouse on Tuesday 29 September to load my van by 7am.' };
    expect(theFullerPromise(short, full)).toBe('incoming');
    expect(theFullerPromise(full, short)).toBe('existing');
  });

  it('still refuses two promises that name two different dates', () => {
    const tuesday = { text: 'Ask the warehouse on Tuesday 29 September to load my van by 7am' };
    const friday = { text: 'Ask the warehouse on Friday 2 October to load my van by 7am' };
    expect(nameTwoDifferentDates(tuesday, friday)).toBe(true);
    expect(theFullerPromise(tuesday, friday)).toBeNull();
  });

  it('still refuses two promises that are simply different', () => {
    expect(theFullerPromise({ text: 'Plan shorter routes for the week' }, { text: 'Send the price list to every shop' })).toBeNull();
  });

  it('does not merge on a stray shared date alone, with nothing else in common', () => {
    expect(theFullerPromise({ text: 'Visit Tuskys on Tuesday' }, { text: 'Close the books on Tuesday' })).toBeNull();
  });

  it('keeps the old whole-containment case working, with no date anywhere', () => {
    const short = { text: 'Deliver the Tuskys cookers' };
    const full = { text: 'Deliver the Tuskys cookers and ask for the signed order form' };
    expect(theFullerPromise(short, full)).toBe('incoming');
  });

  it('a promise that is only a date away from another, one side having none, is one promise', () => {
    expect(theFullerPromise({ text: 'Send the price list' }, { text: 'Send the price list on 9 October' })).toBe('incoming');
  });
});
