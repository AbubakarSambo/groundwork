import { theOneWorthAsking, askAboutItBlockFor } from './what-keeps-happening-becomes-a-question';
import { ALIGNMENT_FEED_ONLY_CODES, PATTERN_PROBE_BY_CODE } from '../patterns/pattern-library';

const anyProbeCode = [...PATTERN_PROBE_BY_CODE.keys()][0];
const anotherProbeCode = [...PATTERN_PROBE_BY_CODE.keys()][1];

/*
 * Decision 57, item 8 (30 September 2026): the floor here is the same three-period rule as
 * everywhere else (decision 8), not the weaker "seen twice" this file used to check. `status:
 * SURFACED` alone is not safe to trust for it - a good-news code reaches SURFACED after ONE period
 * (patterns.service's `observePositive`) - so `theOneWorthAsking` now reads the honest count itself.
 */
describe('a pattern is asked about, never named', () => {
  it('says nothing when a thing has been seen once', () => {
    expect(theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 1 }])).toBeNull();
  });

  it('says nothing when a thing has been seen twice - two periods is not three', () => {
    expect(theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 2 }])).toBeNull();
  });

  it('asks once it has reached three periods', () => {
    const one = theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 3 }]);
    expect(one?.code).toBe(anyProbeCode);
    expect(one?.probe).toBeTruthy();
  });

  it('asks from three periods seen, gaps included, even if the consecutive run is shorter', () => {
    /* seenInSessions is the honest count (decision 57, item 1): three periods whether or not they
       are in a row. A lower periodsObserved (a broken streak) still asks once seenInSessions is 3. */
    const one = theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 1, seenInSessions: [1, 3, 6] }]);
    expect(one?.code).toBe(anyProbeCode);
  });

  it('never asks about a read somebody has already said was wrong', () => {
    /* Rating it inaccurate is a correction the product asked for. Asking about it anyway is the
       same fault as a report that keeps counting a line somebody unsaid. */
    expect(theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 9, accuracyRating: false }])).toBeNull();
  });

  it('still asks about one nobody has rated, which is the ordinary case', () => {
    expect(theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 3, accuracyRating: null }])?.code).toBe(anyProbeCode);
    expect(theOneWorthAsking([{ code: anyProbeCode, periodsObserved: 3, accuracyRating: true }])?.code).toBe(anyProbeCode);
  });

  it('never asks about a code that exists for the alignment feed only', () => {
    for (const code of ALIGNMENT_FEED_ONLY_CODES) {
      expect(theOneWorthAsking([{ code, periodsObserved: 9 }])).toBeNull();
    }
  });

  it('never asks about a code with no safe question form', () => {
    expect(theOneWorthAsking([{ code: 'NOT_A_REAL_CODE', periodsObserved: 5 }])).toBeNull();
  });

  it('asks about one thing, not two', () => {
    const one = theOneWorthAsking([
      { code: anyProbeCode, periodsObserved: 3 },
      { code: anotherProbeCode, periodsObserved: 4 },
    ]);
    expect(one?.code).toBe(anotherProbeCode);
  });

  it('adds nothing to a prompt when there is nothing to ask', () => {
    expect(askAboutItBlockFor(null)).toBe('');
  });

  it('tells the model not to name it, and gives it a deadline that actually arrives', () => {
    const block = askAboutItBlockFor({ probe: 'What is the last thing you sent them?' });
    expect(block).toContain('NEVER say that it keeps happening');
    expect(block).toContain('never name the pattern');
    /*
     * THE PERMISSION TO SKIP IS GONE, AND THAT IS THE CHANGE. "Ask this when it genuinely fits...
     * if it does not fit this conversation, leave it" was measured across all 22 situations from
     * both sides, with the block confirmed in the assembled prompt, and asked ZERO times. The model
     * still picks the moment - that part was right - but the session owes the question.
     */
    expect(block).toContain('ASK IT WITHIN THE NEXT TWO REPLIES');
    /* And not "before the session ends", which was the first attempt: sessions do not end. One of
       forty-four reached a close, so that deadline never arrived and the probe was asked six times
       out of twenty-two. */
    expect(block).not.toContain('ASK IT BEFORE THE SESSION ENDS');
    expect(block).not.toContain('leave it');
    expect(block).toContain('What is the last thing you sent them?');
  });

  it('never puts the engine observation in front of anybody', () => {
    const block = askAboutItBlockFor(theOneWorthAsking([
      { code: anyProbeCode, periodsObserved: 3, observationText: 'They have committed to this three times.' },
    ]));
    expect(block).not.toContain('committed to this three times');
  });
});
