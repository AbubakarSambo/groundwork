import { looksLikeAConversation, WHAT_THEY_ARE_CONFIRMING, NOT_CONFIRMED } from './a-conversation-belongs-to-the-people-in-it';

/**
 * UPLOADING A RECORD OF A CONVERSATION SOMEBODY ELSE WAS IN.
 *
 * The person uploading is the only one who can have told the people in it. So the confirmation
 * happens at the moment of uploading and refuses rather than warns - a transcript sitting in a
 * database waiting for permission is the thing this exists to prevent.
 */
describe('what it recognises', () => {
  it('a file that says what it is', () => {
    for (const name of ['Gemini transcript.txt', 'Call notes - Shop A.pdf', 'WhatsApp chat.txt', 'Meeting summary.docx']) {
      expect(looksLikeAConversation(name, 'x')).toBe(true);
    }
  });

  it('a file that has the shape of one', () => {
    const transcript = [
      'Sam: Thanks for making time.',
      'Ngozi: No problem.',
      'Sam: I wanted to ask about your current supplier.',
      'Ngozi: We use them weekly.',
      'Sam: And how is that going?',
      'Ngozi: Fine mostly.',
    ].join('\n');
    expect(looksLikeAConversation('notes.txt', transcript)).toBe(true);
  });

  it('and leaves an ordinary document alone', () => {
    const deck = 'Our strategy for the year.\n\nWe will grow in three markets.\n\nThe first is Lagos.';
    expect(looksLikeAConversation('Strategy 2026.pdf', deck)).toBe(false);
  });

  it('erring towards asking, because the two mistakes are not equal', () => {
    /* Asking about a deck costs one click. A transcript slipping through costs somebody else
       their privacy. */
    expect(looksLikeAConversation('Board conversation.pdf', 'x')).toBe(true);
  });
});

describe('what the person is asked', () => {
  it('to confirm the people in it were told, by them', () => {
    expect(WHAT_THEY_ARE_CONFIRMING).toContain('they know');
    expect(WHAT_THEY_ARE_CONFIRMING).toContain('you told them, rather than us');
  });

  it('in plain terms about why it is being used', () => {
    expect(WHAT_THEY_ARE_CONFIRMING).toContain('help your team work better');
  });

  it('and the refusal says why it cannot be anybody else', () => {
    expect(NOT_CONFIRMED).toContain('We cannot ask them');
    expect(NOT_CONFIRMED).toContain('you are the one who was in the room');
  });

  it('and never claims to hold the customer\'s consent', () => {
    /* We never met them. It records that the person in the room says they told them, which is a
       smaller and honest claim. */
    for (const text of [WHAT_THEY_ARE_CONFIRMING, NOT_CONFIRMED]) {
      expect(text).not.toMatch(/\b(we have their consent|they have agreed|consent obtained)\b/i);
    }
  });
});
