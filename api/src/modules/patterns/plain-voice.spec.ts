import { plainVoice } from './plain-voice';
import { PATTERN_DETECTION_PROMPT } from './pattern-library';

/**
 * THE ALIGNMENT FEED SHOULD NOT READ LIKE A COURT CASE.
 *
 * Verbatim from a real twelve-session ground, nine of the ten entries in a
 * single column:
 *
 *   "The record shows a confident, positive assessment, but contains no specific
 *    examples of the described performance when repeatedly prompted."
 *   "The record describes a six-week period of work against a goal that is now
 *    described as no longer relevant."
 *   "The record shows a direct question is met with an unrelated statement."
 *
 * Any one of those is fine. Ten of them stacked up is disclosure in litigation,
 * and this product is the opposite of that: a shared picture of how work is
 * going, not evidence assembled against a person. The reader knows where it came
 * from. Announcing it every time only adds distance, and distance is what makes
 * somebody feel written about instead of talked to.
 *
 * Voice cannot be enforced structurally - there is no way to check a tone in
 * code - so the prompt does the general work. This specific opener is the
 * exception: it is deterministic, so it is handled in code and cannot come back
 * whatever the model decides to write.
 */

describe('the opener comes off', () => {
  it('removes it and leaves a sentence that still reads', () => {
    expect(plainVoice('The record shows a direct question is met with an unrelated statement.'))
      .toBe('A direct question is met with an unrelated statement.');
  });

  it('handles the other verbs it actually appeared with', () => {
    expect(plainVoice('The record describes a six-week period of work against a goal.'))
      .toBe('A six-week period of work against a goal.');
    expect(plainVoice('The record contains high-level, positive statements.'))
      .toBe('High-level, positive statements.');
    expect(plainVoice('Both records describe a journey from a gap to alignment.'))
      .toBe('A journey from a gap to alignment.');
  });

  it('handles the "that" form', () => {
    expect(plainVoice('The record shows that nobody confirmed the handover.'))
      .toBe('Nobody confirmed the handover.');
  });
});

describe('what it must not do', () => {
  it('leaves a sentence that never had the opener completely alone', () => {
    const already = 'Work marked finished without anyone downstream confirming it.';
    expect(plainVoice(already)).toBe(already);
  });

  it('does not touch the same words in the middle of a sentence', () => {
    /**
     * Only the announcement AT THE FRONT is noise. Mid-sentence the same words
     * carry meaning, and cutting them changes what was said.
     *
     * The first version of this test used "missing from the record for this
     * period", which does not match the pattern with or without the anchor - so
     * removing the anchor left it green and it pinned nothing. This sentence
     * genuinely would be cut by an unanchored version.
     */
    const mid = 'Two commitments are open, and the record shows nothing about them since session 4.';
    expect(plainVoice(mid)).toBe(mid);
  });

  it('does not paraphrase or reorder anything', () => {
    // A rewrite that shifts meaning inside an accountability record would be far
    // worse than a stiff sentence. Only the prefix goes.
    const out = plainVoice('The record shows 22 tickets closed and nothing past its date.');
    expect(out).toBe('22 tickets closed and nothing past its date.');
  });

  it('survives an empty or odd input without throwing', () => {
    expect(plainVoice('')).toBe('');
    expect(plainVoice('The record shows')).toBe('The record shows');
  });
});

describe('the prompt asks for it too', () => {
  it('tells the model to say the thing rather than announce it', () => {
    // The code strips one exact opener. Everything else about the voice depends
    // on the instruction, so the instruction has to actually be in the prompt
    // that ships - asserted against the real string, not the intention.
    expect(PATTERN_DETECTION_PROMPT).toMatch(/SAY THE THING, DO NOT ANNOUNCE/i);
    expect(PATTERN_DETECTION_PROMPT).toMatch(/court case/i);
  });
});
