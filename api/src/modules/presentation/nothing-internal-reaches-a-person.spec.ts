import { readFileSync } from 'fs';
import { join } from 'path';
import { forHumans, hadCloseMarker } from './outbound';

/**
 * THE LEAKS THAT WERE ON SCREEN, AND THE SEAM THAT NOW STOPS THEM.
 *
 * Both were photographed in the live product on `/start`:
 *
 *   "This is a strong, evidence-based definition of success. [[SESSION_COMPLETE]]"
 *   "1. **Outreach:** A list of contacts, qualified against your client profile"
 *
 * Neither is a wording problem. The authenticated check-in strips both; the anonymous entry chat
 * applied none of the four outbound transforms, so whatever the model emitted reached the screen.
 */

describe('control markers never reach a person', () => {
  it('strips the close marker that was printed in a chat bubble', () => {
    const seen = 'This is a strong, evidence-based definition of success.\n\n[[SESSION_COMPLETE]]';
    expect(forHumans(seen)).toBe('This is a strong, evidence-based definition of success.');
  });

  it('strips any bracketed marker, not only the one we know about', () => {
    /**
     * A list of known markers would have to be updated by whoever adds the next one, and the
     * person adding a marker is not thinking about display. The shape is the rule.
     */
    expect(forHumans('Done. [[NEEDS_REVIEW]]')).toBe('Done.');
    expect(forHumans('[[HANDOFF]] Over to you.')).toBe('Over to you.');
  });

  it('but callers can still ask whether the marker was there', () => {
    /** The entry flow branches on session end, so removing it silently would break closing. */
    expect(hadCloseMarker('All set. [[SESSION_COMPLETE]]')).toBe(true);
    expect(hadCloseMarker('All set.')).toBe(false);
  });

  it('leaves ordinary square brackets alone', () => {
    expect(forHumans('He said [sic] the deal closed.')).toBe('He said [sic] the deal closed.');
  });
});

describe('markdown never reaches a person as punctuation', () => {
  it('the exact line from the screenshot', () => {
    expect(forHumans('1. **Outreach:** A list of contacts, qualified against your client profile.'))
      .toBe('1. Outreach: A list of contacts, qualified against your client profile.');
  });

  it('handles bold, italic and both', () => {
    expect(forHumans('**bold** and *italic* and ***both***')).toBe('bold and italic and both');
  });

  it('strips bullet markers but keeps the line', () => {
    expect(forHumans('- first thing\n- second thing')).toBe('first thing\nsecond thing');
  });

  it('strips headings', () => {
    expect(forHumans('## What we heard\nYou said the quarter was fine.'))
      .toBe('What we heard\nYou said the quarter was fine.');
  });

  it('does NOT eat a snake_case word or a multiplication sign', () => {
    /**
     * The failure mode of a careless strip. `__bold__` and `two_words_here` differ only by
     * position, and "3 * 4" is not an italic opener.
     */
    expect(forHumans('the field is created_at not createdAt')).toBe('the field is created_at not createdAt');
    expect(forHumans('roughly 3 * 4 people')).toBe('roughly 3 * 4 people');
  });

  it('keeps a lone asterisk that is not a pair', () => {
    expect(forHumans('the target * was never agreed')).toBe('the target * was never agreed');
  });
});

describe('dashes, because the same string should not need two passes', () => {
  it('an em dash between clauses becomes a comma', () => {
    expect(forHumans('the queue—the only thing measured')).toBe('the queue, the only thing measured');
  });

  it('and it works on text that also carried markup', () => {
    /** The point of one boundary: a string does not get half-treated depending on its path. */
    expect(forHumans('**Result:** signed contracts—at least 400k. [[SESSION_COMPLETE]]'))
      .toBe('Result: signed contracts, at least 400k.');
  });
});

describe('every service that emits human-facing text goes through the boundary', () => {
  /**
   * THE ASSERTION THAT MATTERS MORE THAN THE FIXES ABOVE.
   *
   * "Party 2" was fixed on the reveal row and reappeared in the participant report. "Both
   * activated" was fixed once and there are ten more like it. A transform applied by convention
   * decays; one a test enumerates does not. If a new service starts talking to people, this fails
   * until somebody routes it through here.
   */
  const EMITTERS = [
    'modules/entry/entry.service.ts',
    'modules/conversation/conversation.service.ts',
  ];

  it.each(EMITTERS)('%s routes its replies through forHumans', (rel) => {
    const code = readFileSync(join(__dirname, '..', '..', 'modules', ...rel.split('/').slice(1)), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).toMatch(/forHumans\(/);
  });

  it('and nothing re-implements the marker strip locally', () => {
    /** Two implementations of one rule is how the four transforms drifted apart to begin with. */
    for (const rel of EMITTERS) {
      const code = readFileSync(join(__dirname, '..', '..', 'modules', ...rel.split('/').slice(1)), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/\[\[SESSION_COMPLETE\]\]/);
    }
  });
});
