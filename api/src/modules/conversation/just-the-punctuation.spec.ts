import { justThePunctuation, punctuationEverywhere } from './anthropic.service';

describe('punctuation on structured output', () => {
  /* Both of these reached a customer's report, in the same paragraph. */
  it('straightens a curly apostrophe', () => {
    expect(justThePunctuation('The consultant’s advice was useful.')).toBe("The consultant's advice was useful.");
  });

  it('removes a closing bracket that never opened', () => {
    expect(justThePunctuation('Nothing was removed from the record: it is in their own session.]'))
      .toBe('Nothing was removed from the record: it is in their own session.');
  });

  it('leaves a bracket that did open', () => {
    const kept = 'She set it up (her programme manager found the contact).';
    expect(justThePunctuation(kept)).toBe(kept);
  });

  it('straightens dashes, quotes and ellipsis', () => {
    expect(justThePunctuation('a — b “c” d…')).toBe('a - b "c" d...');
  });

  it('reaches every string in a nested result, and changes nothing else', () => {
    const out = punctuationEverywhere({
      sharedPicture: 'It’s here.]',
      divergences: [{ topic: 'pace', evidence: ['he — she'] }],
      count: 4,
      flag: true,
      nothing: null,
    });
    expect(out.sharedPicture).toBe("It's here.");
    expect(out.divergences[0].evidence[0]).toBe('he - she');
    expect(out.count).toBe(4);
    expect(out.flag).toBe(true);
    expect(out.nothing).toBeNull();
  });
});
