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
      .toBe('The goal is to better understand · 23 Sept');
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
});
