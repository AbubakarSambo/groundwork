import { aClaimNothingShowsYet, askForProofKindly } from './asking-for-proof-kindly';

describe('asking for proof kindly', () => {
  const t = (role: string, content: string) => ({ role, content });

  it('finds the last thing they said was done, when nothing shows it', () => {
    expect(aClaimNothingShowsYet([
      t('AI', 'What moved this week?'),
      t('PERSON', 'Busy week. Kariuki Butchery paid on Monday. I also visited three shops.'),
    ])).toBe('Kariuki Butchery paid on Monday.');
  });

  it('asks nothing where they already said what shows it, or it was asked already', () => {
    expect(aClaimNothingShowsYet([t('PERSON', 'We signed Fresh Foods. The contract is attached.')])).toBeNull();
    expect(aClaimNothingShowsYet([t('AI', 'Could you send a photo of it?'), t('PERSON', 'We signed Fresh Foods.')])).toBeNull();
  });

  it('asks nothing about what did not happen', () => {
    expect(aClaimNothingShowsYet([t('PERSON', 'The approval was not signed.')])).toBeNull();
  });

  it('asks kindly and says what it is for', () => {
    const b = askForProofKindly('Kariuki Butchery paid on Monday.');
    expect(b).toContain('"Kariuki Butchery paid on Monday."');
    expect(b).toContain('Then it counts as proven.');
    expect(b).toContain('Never sound as if you doubt them.');
    expect(askForProofKindly(null)).toBe('');
  });
});
