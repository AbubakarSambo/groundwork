import { withoutDashes } from './forensic-voice';

/**
 * A PLAIN HYPHEN DOING A DASH'S JOB IS A TYPO ON SOMEBODY'S SCREEN.
 *
 * Read twice in one live setup on 17 September 2026: "the cost per delivery is down-for example,
 * under 500 per delivery", and "the right time to set up a check-in on this-a new quarter". The
 * prompt's own examples use a spaced dash and the model compresses it.
 *
 * This is a DETERMINISTIC edit - a closed list of words that never begin the second half of a
 * compound - which is why it is allowed to change a reply when the judgement-based guards are not.
 * There is nothing here to be wrong about.
 */
describe('a hyphen between clauses', () => {
  it('becomes a comma, in the two forms read live', () => {
    expect(withoutDashes('the cost per delivery is down-for example, under 500'))
      .toBe('the cost per delivery is down, for example, under 500');
    expect(withoutDashes('set up a check-in on this-a new quarter, a push, or something else?'))
      .toBe('set up a check-in on this, a new quarter, a push, or something else?');
  });

  /* The two the first version of the list missed, found by running three lead setups. */
  it('and the verb-opening clauses the first list missed', () => {
    expect(withoutDashes('your part in this situation-are you directly managing Musa?'))
      .toBe('your part in this situation, are you directly managing Musa?');
    expect(withoutDashes('a check-in on this-is it because she is new?'))
      .toBe('a check-in on this, is it because she is new?');
  });

  it('and leaves every real compound alone, which is the whole risk', () => {
    for (const compound of ['check-in', 'follow-up', 'cost-per-delivery', 'well-run', 'day-to-day', 'twenty-five', 'end-to-end', 'crash-free']) {
      expect(withoutDashes(`They ran a ${compound} review.`)).toContain(compound);
    }
  });

  it('still does the em and en dash it always did', () => {
    expect(withoutDashes('the queue—the only thing measured')).toBe('the queue, the only thing measured');
    expect(withoutDashes('the queue – the only thing measured')).toBe('the queue, the only thing measured');
  });

  it('and never doubles a comma that was already there', () => {
    expect(withoutDashes('first, second-and third')).toBe('first, second, and third');
  });
});
