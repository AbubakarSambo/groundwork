import {
  confidenceInThePicture,
  provenanceLine,
  isSettled,
  selfContradictionLine,
  CURRENT_BEST_READING,
  type Provenance,
} from './confidence-in-the-picture';

/**
 * A RECORD CAN BE THIN. A PERSON CANNOT. (G30, G31, G32, G33)
 *
 * The specificity measurement was never wrong. What was wrong is what it was
 * attached to: a person, so a thin week became a property of the human being who
 * had it. "Low specificity" is a judgement of somebody; "we are not confident
 * this part of the picture is complete" is the same fact with nobody in the dock.
 *
 * This was the last place in the report where a verdict on a person survived, and
 * it survived precisely because it looks like arithmetic - and arithmetic feels
 * neutral. Everything else was already careful: gaps are about the work,
 * divergences are about accounts, the contribution read refuses to state a
 * position at all.
 *
 * So these assertions are mostly about the SUBJECT of a sentence, which is the
 * entire fix.
 */

describe('the confidence read is about the picture', () => {
  it('never names a person or a quality of one', () => {
    // THE REGRESSION, and the reason this file exists. Every band, checked for
    // the vocabulary of marking somebody.
    const bands = [
      confidenceInThePicture(0, 0),
      confidenceInThePicture(4, 0.2),
      confidenceInThePicture(4, 1.4),
      confidenceInThePicture(4, 2.6),
    ];
    for (const { line } of bands) {
      /**
       * THE FIRST VERSION OF THIS LIST BANNED "weak" OUTRIGHT, AND CAUGHT THE
       * LINE THAT IS MOST RIGHT.
       *
       *   "so it is a weak basis for a decision about anybody"
       *
       * That is a judgement of the EVIDENCE, which is the entire point of the
       * fix - and a word blacklist cannot tell what a word is about. Which is
       * the same lesson as the thing being fixed here: the specificity number
       * was never wrong, it was attached to the wrong object.
       *
       * So the patterns say what they actually mean: a quality word applied to a
       * person or their record, rather than the word anywhere in the sentence.
       */
      for (const pattern of [
        /\btheir\b/i, /\bthey (?:are|were|have been)\b/i,
        /\b(?:vague|poor|weak|thin|low)\s+(?:account|record|contribution|answers?|input|performance)\b/i,
        /\bwas (?:vague|poor|weak)\b/i, /\bfail/i,
        /\blow specificity\b/i, /\bscore\b/i, /\b\d+%/,
      ]) {
        expect({ line, pattern: String(pattern), hit: pattern.test(line) }).toMatchObject({ hit: false });
      }
    }
  });

  it('says the thin case as a limit on the reader, not a mark on the writer', () => {
    const { band, line } = confidenceInThePicture(6, 0.3);
    expect(band).toBe('thin');
    expect(line).toMatch(/not confident this part of the picture is complete/);
    // And says what to do with it, which is the part that makes it useful.
    expect(line).toMatch(/weak basis for a decision about anybody/);
  });

  it('distinguishes "not built yet" from "empty"', () => {
    // Nobody has been asked. That is a fact about the ground, not about them.
    const { band, line } = confidenceInThePicture(0, 0);
    expect(band).toBe('nothing yet');
    expect(line).toMatch(/has not been built rather than being empty/);
  });

  it('tells a reader to read the specifics when it is mixed', () => {
    expect(confidenceInThePicture(5, 1.5).line).toMatch(/Read the specifics, not the summary/);
  });

  it('and says plainly when it is well covered', () => {
    expect(confidenceInThePicture(5, 2.4).band).toBe('well covered');
  });
});

describe('what a claim rests on, said at the claim', () => {
  const p = (over: Partial<Provenance> = {}): Provenance =>
    ({ accounts: 1, supported: false, contradicted: false, firstSeenSession: 4, ...over });

  it('one unsupported account says so, in as many words', () => {
    // THE REGRESSION G31 EXISTS FOR. In a report, "one account nobody touched"
    // and "three people said it" look identical, and a reader treats both as
    // established.
    expect(provenanceLine(p())).toMatch(/nothing else in the record touches it/);
    expect(provenanceLine(p())).toMatch(/Nobody has disagreed, and nobody has confirmed it either/);
  });

  it('and is not settled', () => {
    expect(isSettled(p())).toBe(false);
  });

  it('two independent accounts are', () => {
    expect(isSettled(p({ accounts: 3 }))).toBe(true);
    expect(provenanceLine(p({ accounts: 3 }))).toMatch(/independently by 3 people/);
  });

  it('one account with support is, and reads differently from one without', () => {
    expect(isSettled(p({ supported: true }))).toBe(true);
    expect(provenanceLine(p({ supported: true }))).toMatch(/with something else in the record supporting it/);
  });

  it('a contradicted claim is never settled, however many said it', () => {
    // The case where counting would give the wrong answer.
    expect(isSettled(p({ accounts: 5, contradicted: true }))).toBe(false);
    expect(provenanceLine(p({ accounts: 5, contradicted: true })))
      .toMatch(/a difference between accounts, not a settled fact/);
  });

  it('says where to go and look', () => {
    expect(provenanceLine(p())).toMatch(/session 4/);
  });
});

describe('somebody contradicting themselves', () => {
  const c = { earlier: { text: 'a', session: 3 }, later: { text: 'b', session: 9 } };

  it('names both sessions so it can be checked', () => {
    expect(selfContradictionLine(c)).toMatch(/session 3/);
    expect(selfContradictionLine(c)).toMatch(/session 9/);
  });

  it('is not a gotcha, and the wording is the whole difference', () => {
    // People are allowed to change their minds, and most changes of mind are
    // somebody learning something. What is worth surfacing is that nobody said
    // it changed, which leaves everyone else working from the old version.
    const line = selfContradictionLine(c);
    expect(line).toMatch(/Changing your mind is not a problem/);
    expect(line).toMatch(/whether anybody else knows it changed/);
    for (const pattern of [/inconsisten/i, /contradict/i, /discrepanc/i, /claimed/i]) {
      expect({ pattern: String(pattern), hit: pattern.test(line) }).toMatchObject({ hit: false });
    }
  });
});

describe('the report says it is not final', () => {
  it('in one sentence, and not in a footer', () => {
    // A record that presents itself as settled invites people to argue with it
    // instead of adding to it, which is the opposite of what it is for.
    expect(CURRENT_BEST_READING).toMatch(/It is not a verdict/);
    expect(CURRENT_BEST_READING).toMatch(/the next session can change any part of it/);
  });
});

describe('the patterns above would still catch the thing they are for', () => {
  /**
   * A narrowed check that cannot fail is worse than a crude one that can, so the
   * old sentences are run through the new patterns explicitly. Without this, the
   * narrowing that let "weak basis" through would silently let everything
   * through.
   */
  const patterns = [
    /\btheir\b/i, /\bthey (?:are|were|have been)\b/i,
    /\b(?:vague|poor|weak|thin|low)\s+(?:account|record|contribution|answers?|input|performance)\b/i,
    /\bwas (?:vague|poor|weak)\b/i, /\bfail/i,
    /\blow specificity\b/i, /\bscore\b/i, /\b\d+%/,
  ];
  const caught = (text: string) => patterns.some((p) => p.test(text));

  it.each([
    'the initiator was vague on evidence in session 12',
    'Low specificity across the record',
    'Their account was thin this session',
    'A poor contribution from one party',
    'Specificity score: 42%',
  ])('still catches: %s', (text) => {
    expect(caught(text)).toBe(true);
  });

  it.each([
    'so it is a weak basis for a decision about anybody',
    'Part of this picture rests on things that could be checked and part does not',
    'This part of the picture is well covered',
  ])('and leaves alone: %s', (text) => {
    expect(caught(text)).toBe(false);
  });
});
