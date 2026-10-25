import { isACorrection, whatTheyMean, theCorrectionAnswered } from './a-correction-said-in-ask';

/* Polish round 1 (26 October): Wanjiru's "I did not say that" in Ask was answered "I cannot answer that one yet". */
describe('a correction said in Ask is checked against what they wrote', () => {
  const MON = new Date('2026-10-12T06:30:00Z');
  const turns = [
    { text: 'Njeri will know today when I set up the check-in. She will be told that fee notes must be raised for all reported filings.', at: MON, label: 'Litigation team daily' },
    { text: 'FN-004 has not been paid.', at: new Date('2026-10-13T06:30:00Z'), label: 'Fee notes' },
  ];

  it('knows a correction when it hears one, and not otherwise', () => {
    expect(isACorrection('I did not say that. I do not normally mention Njeri in the check-in.')).toBe(true);
    expect(isACorrection('That is not right, I sent the Kilele proof on Monday.')).toBe(true);
    expect(isACorrection('What is on my list?')).toBe(false);
  });

  it('finds what she did write, and shows her where and when, asking what is true now', () => {
    const found = whatTheyMean('I did not say that. I do not normally mention Njeri in the check-in.', turns);
    expect(found?.sentence).toBe('Njeri will know today when I set up the check-in.');
    expect(theCorrectionAnswered(found, false)).toBe('I checked. On Monday 12 October, in “Litigation team daily”, you wrote: “Njeri will know today when I set up the check-in.” If that is no longer true, tell me what is true now and I will put it on record.');
  });

  it('a quotation nothing of hers holds is taken off; with nothing to go on it asks which line', () => {
    expect(whatTheyMean('I never said "Aisha is my strongest associate"', turns)).toBeNull();
    expect(theCorrectionAnswered(null, true)).toBe('I checked, and nothing you wrote says that. It is taken off, and Groundwork will not say it again.');
    expect(theCorrectionAnswered(null, false)).toMatch(/^Which line is wrong\?/);
  });
});
