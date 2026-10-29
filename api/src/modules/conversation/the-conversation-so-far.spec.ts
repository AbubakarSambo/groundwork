import { theConversationSoFar } from './the-conversation-so-far';
import { A_CORRECTION_IS_NOT_A_SCOLDING } from './prompt-library';

/**
 * THE MODEL IS GIVEN THE CONVERSATION, NOT ITS OWN OLD WORDING (29 October 2026). "Understood. We can leave that there." came back twice
 * in the re-check: the prompt quoted it as a thing never to say, and a fixed line of ours stays in a session's history to be copied.
 */
describe('what the model is given of the conversation so far', () => {
  const turns = [
    { role: 'AI', content: 'This takes about ten minutes. What moved on Kilele Hotel since Friday?' },
    { role: 'PERSON', content: 'They paid for the 12 units.' },
    { role: 'AI', content: 'Thank you, that is noted. What shows the payment?' },
    { role: 'PERSON', content: 'The M-Pesa code is TKL8M2QX4P.' },
    { role: 'AI', content: 'Good. When is the next delivery?' },
    { role: 'PERSON', content: 'Next Tuesday.' },
    { role: 'AI', content: 'Who will take it? And what does the customer still need?' },
  ];

  it('keeps every word of theirs, and our last two turns as written', () => {
    const h = theConversationSoFar(turns);
    expect(h.filter((t) => t.role === 'user').map((t) => t.content)).toEqual(['They paid for the 12 units.', 'The M-Pesa code is TKL8M2QX4P.', 'Next Tuesday.']);
    expect(h[4].content).toBe('Good. When is the next delivery?');
    expect(h[6].content).toBe('Who will take it? And what does the customer still need?');
  });

  it('gives an older turn of ours only as the question it asked', () => {
    const h = theConversationSoFar(turns);
    expect(h[0].content).toBe('What moved on Kilele Hotel since Friday?');
    expect(h[2].content).toBe('What shows the payment?');
  });

  it('the instruction on corrections quotes no words not to say', () => {
    expect(A_CORRECTION_IS_NOT_A_SCOLDING).not.toMatch(/leave that there/i);
  });
});
