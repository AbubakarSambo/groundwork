import { screen, numbersNobodySaid } from './nothing-invented-reaches-them';
import { namesNobodySaid } from './the-record-holds-what-was-said';

/**
 * THE PRODUCT WROTE THE SENTENCE SHE ASKED FOR AND THEN ATE IT.
 *
 * Two days of "it will not give me a date", and the engine was giving her one every time. The gate
 * that stops an invented name or an invented figure reaching somebody was deleting the whole
 * sentence, silently, before it left the server:
 *
 *   "End of the year, so 31 December 2026?"        gone, as a name nobody said (December)
 *   "You said Friday. Which Friday?"               gone, as a name nobody said (Friday)
 *   "So the deadline is Monday the 5th."           gone, twice over (Monday, and the 5)
 *   "Is that by December, or by March?"            gone
 *
 * Read off one short setup conversation: six dropped sentences. It is also why replies arrived
 * truncated, and why one turn reached her with no question in it at all - the question had been
 * inside a cut sentence.
 *
 * BOTH HALVES WERE THE SAME MISTAKE. A month is a capitalised word she did not type, and the day
 * of the month is a figure she did not say. Both are true, and neither is an invention: the whole
 * point of that sentence is that the product worked the date out from "end of the year" and is
 * showing her its reading so she can confirm it.
 *
 * WHAT MUST STILL BE CAUGHT is a name or a figure attached to somebody's work that nobody gave -
 * a colleague named into a record, a target nobody set. Those are the last two cases below.
 */
describe('a date is not an invention', () => {
  const said = ['We want 40 shops in Kano by the end of Q4.'];

  it('the sentence she asked for reaches her', () => {
    expect(screen('End of the year, so 31 December 2026?', said).dropped).toEqual([]);
  });

  it('and every other way of putting a date to somebody', () => {
    for (const line of [
      'You said Friday. Which Friday?',
      'So the deadline is Monday the 5th.',
      'Is that by December, or by March?',
      'Q4 ends on 31 December.',
      'What happens in January if the shops are not stocked?',
      'By the 22nd, then.',
    ]) {
      expect({ line, dropped: screen(line, said).dropped }).toEqual({ line, dropped: [] });
    }
  });

  it('a month is not a name', () => {
    expect(namesNobodySaid('So 31 December 2026, then.', said)).toEqual([]);
    expect(namesNobodySaid('You said Friday.', said)).toEqual([]);
  });

  it('and the day of the month is not a figure nobody said', () => {
    expect(numbersNobodySaid('So 31 December 2026, then.', said)).toEqual([]);
    expect(numbersNobodySaid('The deadline is Monday the 5th.', said)).toEqual([]);
  });

  it('but a figure attached to the work still is', () => {
    expect(numbersNobodySaid('Your target is 250 shops.', said)).toEqual(['250']);
    expect(screen('That is 1,200 units so far.', said).dropped).toHaveLength(1);
    expect(screen('That puts you at 60 per cent.', said).dropped).toHaveLength(1);
  });

  it('and a number they did say is still theirs', () => {
    expect(numbersNobodySaid('That is 40 shops.', said)).toEqual([]);
  });
});
