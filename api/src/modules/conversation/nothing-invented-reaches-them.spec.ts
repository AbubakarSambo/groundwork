import { screen, SentenceGate, intoSentences, ASK_AGAIN, DELETES_WHAT_IT_FINDS } from './nothing-invented-reaches-them';

const HERS = ['we sell to microchipshit and the rollout is late'];

/**
 * THE GATE STOPPED DELETING, AND THESE TESTS SAY SO RATHER THAN BEING TURNED OFF.
 *
 * Every test below used to assert that an offending sentence never reached the person. That was the
 * contract until 17 September 2026, when Hafsah read what deleting actually does on a screen: asked
 * for examples and finally given them, she got a reply with its middle cut out and an unclosed
 * quotation mark, because "Those" is capitalised and she had not typed it. Before that the same gate
 * had eaten month names, day numbers, and her own places and people.
 *
 * What it guards is QUESTIONS, not the record - the record is built from what the person typed, and
 * nothing screened here ever reaches it. So the cost of a miss is an awkward question somebody
 * corrects in a line, and the cost of a deletion is a mangled sentence at the moment the product was
 * being useful. See DELETES_WHAT_IT_FINDS for the whole argument.
 *
 * So the detection is asserted exactly as hard as before - every hit, every check name, every
 * offending word - and what changed is only what happens to the text.
 */
describe('the unit is the sentence', () => {
  it('finds an invented name and names it, and leaves the sentence where it is', () => {
    const { text, hits, dropped } = screen(
      'That sounds difficult. Did Alex Smith get back to you? Tell me what happened next.',
      HERS,
    );
    /* Still found, still named, still counted: the log is the whole point of keeping it. */
    expect(hits.map((h) => h.check)).toEqual(['a name nobody said']);
    expect(hits[0].offending).toEqual(['Alex Smith']);
    expect(dropped).toEqual(['Did Alex Smith get back to you? ']);
    /* And nothing is removed. */
    expect(DELETES_WHAT_IT_FINDS).toBe(false);
    expect(text).toBe('That sounds difficult. Did Alex Smith get back to you? Tell me what happened next.');
  });

  it('and repairs before it drops, because putting their word back is better than losing it', () => {
    /* A mangled version of their own word is repaired. Only what cannot be repaired is dropped. */
    const { text, dropped } = screen('So Microchip Solutions is the blocker?', HERS);
    expect(text).toBe('So microchipshit is the blocker?');
    expect(dropped).toEqual([]);
  });

  it('and a reply that is nothing but an invention still comes back, with the hit beside it', () => {
    const { text, hits } = screen('Did Alex Smith reply?', HERS);
    expect(hits).toHaveLength(1);
    expect(text).toBe('Did Alex Smith reply?');
  });

  it('and leaves an ordinary reply exactly as it was', () => {
    const reply = 'Tell me what happened with the rollout. What does late mean here?';
    expect(screen(reply, HERS).text).toBe(reply);
  });
});

describe('the stream emits only what it has checked', () => {
  it('holds a fragment back until the sentence is finished', () => {
    /*
     * Checking half a sentence would pass a name that the other half turns into an invention, and
     * there is no way to un-send a delta.
     */
    const g = new SentenceGate(HERS);
    expect(g.push('That sounds')).toBe('');
    expect(g.push(' difficult.')).toBe('');
    expect(g.push(' Tell me more.')).toBe('That sounds difficult. ');
    expect(g.flush()).toBe('Tell me more.');
  });

  it('notes a sentence with an invented name in it, and still emits it', () => {
    const g = new SentenceGate(HERS);
    g.push('Did Alex Smith reply? ');
    const out = g.push('What happened next? ');
    expect(g.dropped).toEqual(['Did Alex Smith reply? ']);
    expect(g.hits.map((h) => h.check)).toEqual(['a name nobody said']);
    expect(out).toBe('Did Alex Smith reply? ');
    expect(g.flush()).toBe('What happened next? ');
  });

  it('and repairs one it can, mid-stream', () => {
    const g = new SentenceGate(HERS);
    g.push('So Microchip Solutions is the blocker?');
    expect(g.flush()).toBe('So microchipshit is the blocker?');
  });

  it('and what it emits, concatenated, is the whole reply, with the hits written down beside it', () => {
    /* The deltas are still the record of what was seen. Nothing is corrected afterwards, because
       nothing is removed - which is also why a person never watches a sentence disappear. */
    const g = new SentenceGate(HERS);
    const seen = ['Right. ', 'Did Alex Smith reply? ', 'What is late?']
      .map((d) => g.push(d)).join('') + g.flush();
    expect(seen).toBe('Right. Did Alex Smith reply? What is late?');
    expect(g.hits).toHaveLength(1);
  });
});

describe('when nothing survives', () => {
  it('the person is asked again rather than shown an empty bubble', () => {
    /* Not an apology and not an error: from their side nothing went wrong. Telling them the model
       hallucinated is both alarming and useless to them. */
    expect(ASK_AGAIN).toMatch(/Say that again/);
    expect(ASK_AGAIN).not.toMatch(/sorry|error|failed|hallucinat/i);
  });
});

describe('sentence splitting', () => {
  it('keeps the terminator so what is emitted reads normally', () => {
    expect(intoSentences('One. Two! Three?')).toEqual(['One. ', 'Two! ', 'Three?']);
  });

  it('and treats a line break as a boundary, for lists', () => {
    expect(intoSentences('Still to do:\n- one\n- two')).toEqual(['Still to do:\n', '- one\n', '- two']);
  });
});
