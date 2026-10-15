import { withoutTheGoodbye, saysGoodbye, theOneThingNeverAsked } from './the-close-is-held-once';
import { withTheOneMoreLine } from './a-turn-asks-one-thing';

/**
 * "THIS CHECK-IN WILL CONTINUE IN TWO WEEKS", THEN "ONE MORE BEFORE THIS CLOSES".
 *
 * Week 2 live run, 28 September 2026, seniorhire. The close was held, and the product's last
 * question went under the model's goodbye, which the goodbye list did not know. Tobi read both in
 * one turn. The goodbye now comes off like any other before the product's question goes on.
 */
describe('the check-in continuing is a goodbye', () => {
  const TOBI = 'You need a conversation with Amina to clarify the full scope of your responsibilities, beyond client happiness, health reporting, and issue resolution. This check-in will continue in two weeks.';

  it('comes off before the one more line, and what came before it stays', () => {
    const ask = theOneThingNeverAsked('what you need from other people');
    const turn = withTheOneMoreLine(withoutTheGoodbye(TOBI), ask);
    expect(turn).not.toMatch(/continue in two weeks/);
    expect(turn).toContain('You need a conversation with Amina');
    expect(turn).toContain(ask);
  });

  it('is read as a goodbye', () => {
    expect(saysGoodbye('This check-in will continue in two weeks.')).toBe(true);
    expect(saysGoodbye('The session continues next week.')).toBe(true);
    expect(saysGoodbye('We will speak again next time.')).toBe(true);
  });

  it("and the person's own commitment to continue is never taken for one", () => {
    const theirs = 'You will continue to follow up with the committee, and you will speak with the head of credit within two days.';
    expect(saysGoodbye(theirs)).toBe(false);
    expect(withoutTheGoodbye(theirs)).toBe(theirs);
    expect(saysGoodbye('This conversation is about your credit sales target for this quarter.')).toBe(false);
  });
});
