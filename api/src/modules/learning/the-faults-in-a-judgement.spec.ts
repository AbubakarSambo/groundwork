import { theFaultsInAJudgement, aPronounForAPerson } from './the-faults-in-a-judgement';

describe('the faults a machine can find in a served judgement', () => {
  it('finds a pronoun beside "you", and beside a name', () => {
    expect(aPronounForAPerson('Your own record says they have not given Tobi the dates.')).toBe(true);
    expect(aPronounForAPerson('Amina Bello said she would send the sheets.')).toBe(true);
  });
  it('leaves a sentence with no pronoun, and one with a pronoun and nobody to point at', () => {
    expect(aPronounForAPerson('Amina Bello said Amina Bello would send the sheets.')).toBe(false);
    expect(aPronounForAPerson('It rose because they changed the price.')).toBe(false);
  });
  it('reads every part of the judgement and says where the scenario was', () => {
    const faults = theFaultsInAJudgement({
      theGap: 'You are holding up the move, and your account does not show that they know it.',
      whatToDo: [{ move: 'Speak with Amina Bello.', because: 'Amina Bello says she has not been told.' }],
      whatThisCannotTellYou: [{ why: 'Nothing here.', about: 'Whether it happened.' }],
    }, 'snapshot');
    expect(faults.map((f) => f.quote)).toEqual(['You are holding up the move, and your account does not show that they know it.', 'Amina Bello says she has not been told.']);
    expect(faults.every((f) => f.scenario === 'snapshot')).toBe(true);
  });
  it('is not upset by a judgement with nothing in it', () => {
    expect(theFaultsInAJudgement(null)).toEqual([]);
    expect(theFaultsInAJudgement({})).toEqual([]);
  });
});
