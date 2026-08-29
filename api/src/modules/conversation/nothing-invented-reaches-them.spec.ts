import { screen, SentenceGate, intoSentences, ASK_AGAIN } from './nothing-invented-reaches-them';

const HERS = ['we sell to microchipshit and the rollout is late'];

describe('the unit is the sentence', () => {
  it('so one invented name does not cost three good sentences', () => {
    /*
     * Dropping the whole reply leaves somebody staring at nothing; editing words out mid-sentence
     * leaves prose that reads as though the engine lost its train of thought. A sentence is the
     * smallest thing that can be removed and leave what remains readable.
     */
    const { text, dropped } = screen(
      'That sounds difficult. Did Alex Smith get back to you? Tell me what happened next.',
      HERS,
    );
    expect(text).toBe('That sounds difficult. Tell me what happened next.');
    expect(dropped).toEqual(['Did Alex Smith get back to you? ']);
  });

  it('and repairs before it drops, because putting their word back is better than losing it', () => {
    /* A mangled version of their own word is repaired. Only what cannot be repaired is dropped. */
    const { text, dropped } = screen('So Microchip Solutions is the blocker?', HERS);
    expect(text).toBe('So microchipshit is the blocker?');
    expect(dropped).toEqual([]);
  });

  it('and returns nothing rather than passing something through', () => {
    /* A screen that quietly passes something is how "completely" turns back into "usually". */
    expect(screen('Did Alex Smith reply?', HERS).text).toBe('');
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

  it('and never emits a sentence with an invented name in it', () => {
    const g = new SentenceGate(HERS);
    g.push('Did Alex Smith reply? ');
    const out = g.push('What happened next? ');
    expect(out).not.toMatch(/Alex Smith/);
    expect(out).toBe('');
    expect(g.flush()).toBe('What happened next? ');
    expect(g.dropped).toEqual(['Did Alex Smith reply? ']);
  });

  it('and repairs one it can, mid-stream', () => {
    const g = new SentenceGate(HERS);
    g.push('So Microchip Solutions is the blocker?');
    expect(g.flush()).toBe('So microchipshit is the blocker?');
  });

  it('and what it emits, concatenated, is what the person saw', () => {
    /* The deltas are the record: nothing is corrected afterwards, because nothing unchecked went. */
    const g = new SentenceGate(HERS);
    const seen = ['Right. ', 'Did Alex Smith reply? ', 'What is late?']
      .map((d) => g.push(d)).join('') + g.flush();
    expect(seen).toBe('Right. What is late?');
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
