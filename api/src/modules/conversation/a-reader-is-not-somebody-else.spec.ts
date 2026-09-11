import { whyItFails } from './nothing-invented-reaches-them';

/**
 * THE PARTICIPANT CALLED BY THE LEAD'S NAME, ON THEIR OWN CHECK-IN.
 *
 * From the first end-to-end run, 11 September. Bisi Adeyemi opened her invitation, said she was the
 * finance manager handing supplier management over, and the second sentence of her session read:
 *
 *   "You're the Finance Manager, Dele, and you currently own supplier management."
 *
 * Dele set the check-in up. Both names are in the model's context and it attached the wrong one to
 * the person it was speaking to.
 *
 * The existing rule catches the reader's OWN name, on the argument that a reply written to somebody
 * addresses them as "you". The same argument covers every other name in that position, and this is
 * the case that actually reached a person.
 */
describe('a name in apposition to "you" is the wrong name whoever it belongs to', () => {
  it('catches the lead\'s name attached to the participant', () => {
    const why = whyItFails(
      "You're the Finance Manager, Dele, and you currently own supplier management.",
      ['I am the finance manager', 'Dele asked me to hand it over'],
      'Bisi',
      ['I am the finance manager'],
    );
    expect(why?.check).toBe("called the reader by somebody else's name");
    expect(why?.offending).toContain('Dele');
  });

  it('catches it at the front of the sentence too', () => {
    const why = whyItFails('Dele, you currently own the payment run.', ['Dele asked me'], 'Bisi', ['Dele asked me']);
    expect(why?.check).toBe("called the reader by somebody else's name");
  });

  it('leaves alone a sentence that is legitimately about somebody else', () => {
    const why = whyItFails(
      'You mentioned that Daniel routes escalations to you rather than to Amara.',
      ['Daniel routes escalations to me rather than to Amara'],
      'Bisi',
      ['Daniel routes escalations to me rather than to Amara'],
    );
    expect(why?.check).not.toBe("called the reader by somebody else's name");
  });

  it('does not read an ordinary clause opener as a vocative', () => {
    const why = whyItFails(
      'You said the rota is yours to sign, so that is where this starts.',
      ['the rota is mine to sign'],
      'Bisi',
      ['the rota is mine to sign'],
    );
    expect(why?.check).not.toBe("called the reader by somebody else's name");
  });
});
