import { theJobTheyDescribed, howSureIsThat, WHAT_KIND_OF_WORK_SCHEMA, WHAT_KIND_OF_WORK_PROMPT } from './a-job-is-read-from-what-they-do';
import { MIN_COACHING_CONFIDENCE, ROLE_MAPS } from './role-maps';

describe('a lens becomes a label when it is confidently wrong', () => {
  it('only a clear read reaches the coaching floor', () => {
    expect(howSureIsThat('clear')!).toBeGreaterThanOrEqual(MIN_COACHING_CONFIDENCE);
    expect(howSureIsThat('probable')!).toBeLessThan(MIN_COACHING_CONFIDENCE);
  });

  it('cannot tell is a real answer and produces no read', () => {
    expect(howSureIsThat('cannot_tell')).toBeNull();
    expect(theJobTheyDescribed({ fn: 'SALES', certainty: 'cannot_tell', basis: 'could be either' })).toBeNull();
  });

  it('refuses a read with no basis, like every other read in the product', () => {
    expect(theJobTheyDescribed({ fn: 'SALES', certainty: 'clear', basis: '' })).toBeNull();
    expect(theJobTheyDescribed({ fn: 'SALES', certainty: 'clear' })).toBeNull();
  });

  it('drops a function nothing can render rather than coercing it', () => {
    expect(theJobTheyDescribed({ fn: 'VIBES', certainty: 'clear', basis: 'they seem fun' })).toBeNull();
    expect(theJobTheyDescribed({ fn: '', certainty: 'clear', basis: 'x' })).toBeNull();
    expect(theJobTheyDescribed(null)).toBeNull();
  });

  it('keeps a clear read, and says where it came from', () => {
    const r = theJobTheyDescribed({ fn: 'management', certainty: 'clear', basis: 'They decide who stays and chair the triage meeting.' });
    expect(r?.fn).toBe('MANAGEMENT');
    expect(r?.confidence).toBe(0.6);
    expect(r?.basis).toContain('Read from the account');
  });

  it('offers every function the role maps can render, and no others', () => {
    expect([...(WHAT_KIND_OF_WORK_SCHEMA.input_schema.properties.fn.enum as readonly string[])].sort())
      .toEqual(Object.keys(ROLE_MAPS).sort());
  });

  it('tells the reader to read whose work it is, and that cannot_tell is fine', () => {
    expect(WHAT_KIND_OF_WORK_PROMPT).toContain('READ WHOSE WORK IT IS');
    expect(WHAT_KIND_OF_WORK_PROMPT).toContain('This is a correct and common answer');
    expect(WHAT_KIND_OF_WORK_PROMPT).toContain('worse than being read against none');
  });
});
