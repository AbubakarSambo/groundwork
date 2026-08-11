import { aboutAPerson, GROUPS, CAUGHT_WRONGLY_BEFORE, type Group } from './is-this-about-a-person';

/**
 * FOUR LINES A BLACKLIST GOT WRONG, IN ONE SITTING.
 *
 *   /\bweak\b/       caught "a weak basis for a decision"        the evidence
 *   /\bthey\b/       caught "They are not doing any work here"   the documents
 *   /\bthey are\b/   caught "lives with how they are made"       the decisions
 *   /\bclient\b/     caught "not delivering on client setup"     Daisy's own job
 *
 * The last one is the worst: the person the ground was about, removed from the list
 * of people who could be invited to it, by the word describing her work.
 *
 * Each was fixed where it was found, separately, which is how eight versions of one
 * rule came to exist in this codebase. This is the one place now, and the groups are
 * the point: a contribution record must refuse "strong on delivery" while a
 * confidence read must be allowed to say "a weak basis", and that difference used to
 * be invisible.
 */

const ALL = Object.keys(GROUPS) as Group[];

describe('the four it got wrong', () => {
  it.each(CAUGHT_WRONGLY_BEFORE)('passes, against every group at once: %s', (line) => {
    // THE REGRESSION, and deliberately checked against ALL groups rather than the
    // ones each caller uses - if any future pattern anywhere catches these again,
    // this goes red before it reaches a caller.
    expect({ line, hit: aboutAPerson(line, ALL) }).toMatchObject({ hit: null });
  });
});

describe('and the things it is actually for', () => {
  it.each([
    ['Strong on delivery, developing on judgement', 'quality of a person'],
    ['A poor contribution from one party', 'quality of a person'],
    ['Shows initiative on the client work', 'character'],
    ['Has the right attitude', 'character'],
    ['Is capable of handling a difficult client', 'capability'],
    ['Areas for development: stakeholder management', 'capability'],
    ['Currently operating at a mid level', 'grade'],
    ['Specificity score: 42%', 'grade'],
    ['This looks like somebody gaming the measure', 'motive'],
    ['It appears to be deliberate', 'motive'],
    ['You should prioritise ownership', 'recommendation'],
  ] as [string, Group][])('catches "%s" in %s', (line, group) => {
    expect({ line, hit: aboutAPerson(line, [group]) }).not.toMatchObject({ hit: null });
  });

  it('returns the phrase, not a boolean', () => {
    // Every caller quotes it back, because a message with the words in it gets a
    // sentence rewritten and a message without them gets the thought deleted.
    expect(aboutAPerson('Shows initiative on the client work', ['character'])).toBe('Shows');
  });
});

describe('the groups are separate on purpose', () => {
  it('a confidence read may say "a weak basis" while a record may not say "weak on delivery"', () => {
    // THE DIFFERENCE THE GROUPS EXIST TO MAKE EXPLICIT, in one assertion.
    expect(aboutAPerson('so it is a weak basis for a decision', ['quality of a person'])).toBeNull();
    expect(aboutAPerson('weak on delivery this quarter', ['quality of a person'])).not.toBeNull();
  });

  it('naming a tension is allowed; resolving it is not', () => {
    const tension = 'Keeping the queue clear and expecting client ownership are in tension.';
    expect(aboutAPerson(tension, ['recommendation'])).toBeNull();
    expect(aboutAPerson('You should focus on ownership.', ['recommendation'])).not.toBeNull();
  });

  it('and asking for no group finds nothing, rather than everything', () => {
    // The safe direction for a caller that has not decided yet: a caller with an
    // empty list is under-protected and visible, not silently blocking every
    // sentence it sees.
    expect(aboutAPerson('Shows initiative', [])).toBeNull();
  });
});

describe('what makes a pattern good enough to live here', () => {
  it('every pattern names what it bans, not a bare word', () => {
    /**
     * A BARE SINGLE WORD IS THE FAULT ITSELF. /\bweak\b/ is why "a weak basis"
     * broke; /\bclient\b/ is why Daisy was removed from her own ground. So the
     * shape is asserted: a pattern must carry more than one word, an anchor, or a
     * qualifier - anything that makes it about a phrase rather than a token.
     *
     * "score" and "personality" pass deliberately: neither has an innocent use in
     * a sentence about somebody's work, which is the test for an exception.
     */
    const ALLOWED_BARE = ['score', 'personality', 'cheat', 'dishonest', 'misleading', 'suspicious', 'inflat', 'deliberate'];
    for (const [group, patterns] of Object.entries(GROUPS)) {
      for (const p of patterns) {
        const src = p.source;
        const bare = /^\\\\b[a-z|]+\\\\b$/i.test(src);
        const excused = ALLOWED_BARE.some((w) => src.includes(w));
        expect({ group, pattern: src, bareAndUnexcused: bare && !excused })
          .toMatchObject({ bareAndUnexcused: false });
      }
    }
  });
});
