import { notTheWordParty } from './not-the-word-party';

/**
 * The first example is verbatim from a report on the local database, generated three weeks after
 * the rule forbidding it was written into the prompt.
 */
describe('not the word party', () => {
  it('fixes the sentence that was actually shipped', () => {
    expect(notTheWordParty('Both parties agree that the Renewals owner is responsible for twelve dormant accounts.'))
      .toBe('Both agree that the Renewals owner is responsible for twelve dormant accounts.');
  });

  it('handles the other shapes it turns up in', () => {
    expect(notTheWordParty('All parties have checked in.')).toBe('All have checked in.');
    expect(notTheWordParty('Each party described it differently.')).toBe('Each person described it differently.');
    expect(notTheWordParty('Neither party has moved.')).toBe('Neither of them has moved.');
    expect(notTheWordParty('Two parties, two accounts.')).toBe('Two people, two accounts.');
  });

  it('NEVER touches the label keys, which is the whole risk', () => {
    /*
     * These are matched exactly by own-reads-only.ts to decide whose private rows a reader sees.
     * Rewriting one does not fail loudly - it keeps the wrong rows.
     */
    for (const key of ['the other party', 'the initiator', 'the participant']) {
      expect(notTheWordParty(key)).toBe(key);
    }
  });

  it('and leaves the key alone inside a sentence it is otherwise rewriting', () => {
    /* "the other party" ends in the exact word being replaced. This is the case that breaks it. */
    const sentence = 'Both parties agree, though the other party described the delay differently.';
    const out = notTheWordParty(sentence);
    expect(out).toContain('the other party described the delay differently');
    expect(out).not.toContain('Both parties');
  });

  it('keeps the verb agreeing, which the first version broke', () => {
    /*
     * "everyone agree that..." was the first attempt, and it is worse than the jargon it replaced:
     * "parties" at least parsed. "Both" and "all" are plural already, so nothing else has to move.
     */
    expect(notTheWordParty('Both parties agree.')).toBe('Both agree.');
    expect(notTheWordParty('All parties were clear.')).toBe('All were clear.');
    expect(notTheWordParty('Every party has checked in.')).toBe('Everyone has checked in.');
  });

  it('keeps the capital where the sentence started with one', () => {
    expect(notTheWordParty('Both parties agree.')).toMatch(/^Both/);
    expect(notTheWordParty('We know both parties agree.')).toContain('both agree');
  });

  it('rewrites the bare word too, which is what makes the key protection load-bearing', () => {
    expect(notTheWordParty('She is not a party to this.')).toBe('She is not a person to this.');
    expect(notTheWordParty('The party said otherwise.')).toBe('The person said otherwise.');
  });

  it('leaves text with nothing to fix exactly as it was', () => {
    const clean = 'You both describe the same nine-day delay.';
    expect(notTheWordParty(clean)).toBe(clean);
    expect(notTheWordParty('')).toBe('');
  });
});

/**
 * And the rule has to be ON THE PATH, not just correct in isolation. Removing the call from the
 * reader boundary left every test in this file green, which is the exact failure mode this codebase
 * keeps finding: a rule that nothing calls is a comment.
 */
describe('and it runs where the reader is', () => {
  const src = require('fs')
    .readFileSync(__dirname + '/reports.service.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

  it('is applied inside the transform that shapes text for a reader', () => {
    expect(src).toMatch(/notTheWordParty\(withoutDashes\(withNames\(/);
  });

  it('and the label fields are still excluded from that transform', () => {
    /* If NEVER_NAMED ever loses these, the rule starts rewriting keys despite the placeholder. */
    expect(src).toMatch(/NEVER_NAMED = new Set\(\['label', 'participantLabel'\]\)/);
  });
});
