import { aLabelTheyCanTellApart } from './four-check-ins-with-the-same-name';

/** Four in the rail, all reading "The goal is to better un…". Read live, 23 September 2026. */
describe('a label they can tell apart', () => {
  const when = new Date('2026-09-23T10:00:00Z');

  it('leaves the first one alone', () => {
    expect(aLabelTheyCanTellApart('The goal is to better understand', [], when))
      .toBe('The goal is to better understand');
  });

  it('and dates the one that would have been a duplicate', () => {
    expect(aLabelTheyCanTellApart('The goal is to better understand', ['The goal is to better understand'], when))
      /* U.6 review: a plain phrase, where it was "· 23 Sept" (a dot and a clipped date). */
      .toBe('The goal is to better understand, from 23 September');
  });

  /* A label that differs only in case or a full stop is the same label to a person reading a rail. */
  it('and is not fooled by punctuation or case', () => {
    expect(aLabelTheyCanTellApart('The goal is to better understand', ['the goal is to better understand.'], when))
      .toContain('23 Sep');
  });

  it('and leaves a genuinely different label alone', () => {
    expect(aLabelTheyCanTellApart('New hire - Amara', ['The goal is to better understand'], when))
      .toBe('New hire - Amara');
  });

  it('and does nothing with nothing', () => {
    expect(aLabelTheyCanTellApart('', ['x'], when)).toBe('');
  });

  it('says the topic in the phrase, never a person (U.6 review)', () => {
    expect(aLabelTheyCanTellApart('Help a new hire get started', ['Help a new hire get started'], new Date('2026-09-27T10:00:00Z')))
      .toBe('Help a new hire get started, from 27 September');
  });

  /* Read live: "What moved this week, and what is stuck?, from 27 September". */
  it('gives a name that ends like a sentence the day as a sentence of its own (U.6 review)', () => {
    const on = new Date('2026-09-27T10:00:00Z');
    const q = 'What moved this week, and what is stuck?';
    expect(aLabelTheyCanTellApart(q, [q], on)).toBe('What moved this week, and what is stuck? From 27 September.');
    expect(aLabelTheyCanTellApart('Tell us one win!', ['Tell us one win!'], on)).toBe('Tell us one win! From 27 September.');
    expect(aLabelTheyCanTellApart('Share your update.', ['Share your update.'], on)).toBe('Share your update. From 27 September.');
    expect(aLabelTheyCanTellApart(q, [q], on)).not.toContain('?,');
  });
});
