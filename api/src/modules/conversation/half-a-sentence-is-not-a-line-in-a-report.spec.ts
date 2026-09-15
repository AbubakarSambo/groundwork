import { theLineWithoutItsDanglingJoin as tidy } from './half-a-sentence-is-not-a-line-in-a-report';

describe('half a sentence is not a line in a report', () => {
  it('takes the join off the half that got it', () => {
    expect(tidy('and confirm the new numbers with Amir.')).toBe('Confirm the new numbers with Amir.');
  });

  it('handles the other joins the same way', () => {
    expect(tidy('but Rita is ahead')).toBe('Rita is ahead');
    expect(tidy('so, I will move his number')).toBe('I will move his number');
    expect(tidy('then we review it in March')).toBe('We review it in March');
  });

  it('leaves a sentence that never had one exactly as it was', () => {
    const hers = 'I will speak to Rita on Thursday.';
    expect(tidy(hers)).toBe(hers);
  });

  it('does not touch a word that only starts with a join', () => {
    expect(tidy('Android rollout is late')).toBe('Android rollout is late');
    expect(tidy('Sotira has not replied')).toBe('Sotira has not replied');
  });

  it('leaves a clause opener alone, because it means something', () => {
    expect(tidy('if procurement clears, we close in March')).toBe('if procurement clears, we close in March');
    expect(tidy('because he was pulled onto onboarding')).toBe('because he was pulled onto onboarding');
  });

  it('changes nothing else about her words, including the middle of the line', () => {
    expect(tidy('and he has not really started, and nobody asked him to')).toBe(
      'He has not really started, and nobody asked him to',
    );
  });

  it('keeps a fragment that is nothing but the join rather than storing an empty line', () => {
    expect(tidy('And.')).toBe('And.');
  });
});
