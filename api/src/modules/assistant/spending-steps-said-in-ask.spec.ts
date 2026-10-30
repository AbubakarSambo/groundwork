import { setsSpendingSteps, theStepsSaid, theStepsSetSaid } from './spending-steps-said-in-ask';

/**
 * APPROVAL STEPS FOR SPENDING, SAID IN ONE SENTENCE TO ASK (Hafsah, 26 October 2026). Grace's sentence was answered "I cannot answer
 * that one yet"; now it is read by rules, set, and said back.
 */
const GRACE = { userId: 'u-grace', first: 'Grace', full: 'Grace Achieng' };
const PEOPLE = [{ userId: 'u-mercy', first: 'Mercy', full: 'Mercy Wairimu' }, { userId: 'u-kevin', first: 'Kevin', full: 'Kevin Omondi' }];
const DUTIES = { finance: 'u-mercy' };
const SAID = 'Spending over KES 20,000 should be approved by Mercy in finance first, and then by me.';

describe('the sentence', () => {
  it('is recognised, and a question about spending is not', () => {
    expect(setsSpendingSteps(SAID)).toBe(true);
    expect(setsSpendingSteps('How much have we spent this month?')).toBe(false);
    expect(setsSpendingSteps('Can I spend KES 18,000 on fuel?')).toBe(false);
  });
});

describe('what it sets', () => {
  it('Grace, an admin: finance (Mercy) first, then an admin (her)', () => {
    const r = theStepsSaid(SAID, GRACE, true, PEOPLE, DUTIES);
    expect(r).toEqual({ above: 20000, steps: ['finance', 'admin'], who: ['Mercy', 'Grace'] });
    expect(theStepsSetSaid('KES', r as any, 'Grace')).toBe('Done. A request to spend over KES 20,000 now goes first to whoever looks after finance (Mercy), and then to an admin (you). Each one approves only after the one before. You can see and change it on the spending page.');
  });
  it('by role in words: finance first, then their manager', () => {
    expect(theStepsSaid('Expenses above 50,000 need approval from finance first, then their manager.', GRACE, true, PEOPLE, DUTIES))
      .toEqual({ above: 50000, steps: ['finance', 'manager'], who: [null, null] });
  });
  it('a person who holds no job is not guessed at, and nothing is set', () => {
    const r = theStepsSaid('Spending over KES 20,000 should be approved by Kevin first, then by me.', GRACE, true, PEOPLE, DUTIES);
    expect('notRead' in r && r.notRead).toMatch(/^Kevin holds no job that approves spending yet\./);
  });
  it('somebody who is not an admin and holds no job cannot be a step as "me"', () => {
    const r = theStepsSaid(SAID, { userId: 'u-kevin', first: 'Kevin', full: 'Kevin Omondi' }, false, PEOPLE, DUTIES);
    expect('notRead' in r).toBe(true);
  });
});
