import { withoutAMissedStepNobodySaid } from './a-missing-proof-is-not-a-missed-step';

/**
 * A MISSING PROOF IS NOT A MISSED STEP, AND WAITING IS NOT MOCKED (messages test, third run, item 11). Brian's WhatsApp check-in,
 * Muchemi & Co (test), Wednesday 14 October, the turns as he received them.
 */
describe("what Brian reads after \"I don't have that information.\"", () => {
  it('is not told a step was missed', () => {
    const r = withoutAMissedStepNobodySaid("You said you let Njeri know, but you don't have anything that shows Njeri was informed. That gap has a name and it is worth a conversation: what was the step that was missed?", ['What exists now that shows Njeri was informed? For instance, a confirmation email, a system notification, or something else.']);
    expect(r.text).toBe("You said you let Njeri know, but you don't have anything that shows Njeri was informed. What would you like to add about that?");
    expect(r.text).not.toMatch(/gap has a name|step that was missed/);
  });
  it('and waiting on the court is not called his primary task', () => {
    const r = withoutAMissedStepNobodySaid("That's what you are waiting for. Your primary task today is to wait. Is there anything you will do about this, and by when?");
    expect(r.text).toBe("That's what you are waiting for. Is there anything you will do about this, and by when?");
  });
  it('a real difference between two accounts is left as it was', () => {
    const t = 'Your record describes decisions and direction-setting. The team\'s record describes working independently of those. That gap has a name and it is worth a conversation.';
    expect(withoutAMissedStepNobodySaid(t).text).toBe(t);
  });
});
