import { forHumans, whatIsNewSince } from './outbound';

/**
 * From a user, 10 Sep 2026: "That's a clea writing the text for all of them" - a sentence nobody can
 * understand. The stream cleaned a growing prefix and sliced the new part at the LENGTH of the last
 * cleaned prefix. Cleaning is not prefix-stable (markdown comes out, phrases are rewritten), so the
 * slice skipped words and cut one in half. The live text is now diffed, and the record is the whole.
 */
describe('a stream never loses a letter', () => {
  const raw = "Homepage, about us with bios, what we do, our clients, and contact. That's a **clear commitment:** know which pages are needed and writing the text for all of them. When do you see that text being ready?";

  it('gives the tail when the cleaned text still begins with what was shown, and nothing when it moved', () => {
    expect(whatIsNewSince('Hello there.', 'Hello there. And more.')).toBe(' And more.');
    expect(whatIsNewSince('Hello there.', 'Hallo there. And more.')).toBe('');
    expect(whatIsNewSince('', 'Anything.')).toBe('Anything.');
  });

  it('chunk by chunk, what is shown only ever grows by what really follows it', () => {
    let shown = '';
    for (let i = 5; i <= raw.length; i += 7) {
      const cleaned = forHumans(raw.slice(0, i));
      const fresh = whatIsNewSince(shown, cleaned);
      if (fresh) {
        expect(cleaned.startsWith(shown)).toBe(true);
        shown = cleaned;
      }
    }
    const whole = forHumans(raw);
    expect(whole).toContain('clear commitment');
    expect(whole).not.toMatch(/\bclea\b/);
  });
});
