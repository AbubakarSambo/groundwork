import { recordAndMoveOn, NOTHING_HERE_HAS_A_NUMBER, NO_DECISION_YET } from './a-refusal-is-an-answer';
import { NOTHING_TO_APOLOGISE_FOR, NOTHING_TO_APOLOGISE_FOR_DIRECTLY } from './an-apology-is-not-owed';
import { theCeilingIsReached } from './there-is-a-ceiling-and-it-is-not-a-surprise';

/**
 * THE CHECK-IN'S OWN FIXED LINES, DIRECT, BEHIND THE DIRECT MORNING'S SWITCH (Hafsah, 20 October 2026, part 4).
 *
 * What a rep such as Kevin, or a lead such as Grace, reads in a check-in when the product writes the turn rather than the model: a
 * question let go, an apology, and the answer ceiling. With the switch off, every word is as it was. With it on, nothing is said about
 * how "this record" will read, and nothing defends the tool.
 */
describe('the check-in\'s own lines, switch off: exactly as before', () => {
  it('a question let go', () => {
    expect(recordAndMoveOn('what the target is', { question: 'Which deal closes next?' })).toBe('Then this record shows nothing on what the target is. Which deal closes next?');
    expect(recordAndMoveOn(null, {})).toBe('Understood. This record shows nothing more on that.');
  });
  it('the close, the apology and the ceiling', () => {
    expect(NOTHING_HERE_HAS_A_NUMBER).toBe('Nothing said this time carries a date, a number or a document, and that is how it will read.');
    expect(NO_DECISION_YET).toBe('No decision from you is on this record yet, and that is how it will read.');
    expect(NOTHING_TO_APOLOGISE_FOR).toBe('No need to say sorry here. This is a record of where things are, not a judgement of you.');
    expect(theCeilingIsReached()).toBe('This session is full. It holds twenty answers, and everything you have said is on the record. Finish the check-in, and it will be written up. You can open another session afterwards to add more. Nothing you have written is lost.');
  });
});

describe('the check-in\'s own lines, switch on: plain, and nothing about how the record reads', () => {
  it('a question let go is let go, and the next question follows', () => {
    expect(recordAndMoveOn('what the target is', { question: 'Which deal closes next?' }, true)).toBe('Understood. Which deal closes next?');
    /* Changed 29 October 2026 (two-week check): "We can leave that there" followed Brian's correction and read as brushing it off. */
    expect(recordAndMoveOn(null, {}, true)).toBe('Thank you, that is noted.');
    expect(recordAndMoveOn('what the target is', {}, true)).toBe('Thank you, that is noted.');
  });
  it('the apology and the ceiling', () => {
    expect(NOTHING_TO_APOLOGISE_FOR_DIRECTLY).toBe('No need to say sorry.');
    expect(theCeilingIsReached(true)).toBe('This session is full at twenty answers. Finish the check-in, and it will be written up. You can open another session afterwards to add more.');
  });
  it('none of them says "record", "how it will read" or "lost"', () => {
    for (const l of [recordAndMoveOn('x', {}, true), recordAndMoveOn(null, { owed: 'what moved since yesterday' }, true), NOTHING_TO_APOLOGISE_FOR_DIRECTLY, theCeilingIsReached(true)]) {
      expect(l).not.toMatch(/record|how it will read|lost|judgement/i);
    }
  });
});
