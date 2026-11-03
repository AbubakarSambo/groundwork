import { withoutTheGoodbye, saysGoodbye, hasAGoodbye } from './the-close-is-held-once';

/**
 * "THIS CHECK-IN WILL CONTINUE IN TWO WEEKS", THEN "ONE MORE BEFORE THIS CLOSES".
 *
 * Week 2 live run, 28 September 2026, seniorhire. The close was held, and the product's last
 * question went under the model's goodbye, which the goodbye list did not know. Tobi read both in
 * one turn. The product no longer holds a close with a question of its own (3 November 2026), but a goodbye in a turn that is not
 * the last still comes off, and this one is read as a goodbye like any other.
 */
describe('the check-in continuing is a goodbye', () => {
  const TOBI = 'You need a conversation with Amina to clarify the full scope of your responsibilities, beyond client happiness, health reporting, and issue resolution. This check-in will continue in two weeks.';

  it('comes off a turn that is not the last, and what came before it stays', () => {
    expect(hasAGoodbye(TOBI)).toBe(true);
    const turn = withoutTheGoodbye(TOBI);
    expect(turn).not.toMatch(/continue in two weeks/);
    expect(turn).toContain('You need a conversation with Amina');
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
