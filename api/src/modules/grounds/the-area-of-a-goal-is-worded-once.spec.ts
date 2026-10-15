import { isAPlainAreaPhrase, storedAreaOfAGoal, areaOfGoalOrFallback, wordTheAreaOfAGoal, FALLBACK_AREA } from './the-area-of-a-goal-is-worded-once';

/**
 * DECISION 56, ITEM 2 (second pass, 29 September 2026): the area is worded by the model, once, and
 * kept - checked for a digit, a number word, a currency mark, a percentage, a date or deadline word,
 * or a verb that states hitting a target, before it is ever kept or served.
 */
describe('isAPlainAreaPhrase', () => {
  it('accepts a short, plain noun phrase', () => {
    expect(isAPlainAreaPhrase('the scheduling and the stock counts')).toBe(true);
    expect(isAPlainAreaPhrase('the client relationship')).toBe(true);
  });
  it('refuses a digit', () => {
    expect(isAPlainAreaPhrase('the 40 stock counts')).toBe(false);
  });
  it('refuses a number written as a word', () => {
    expect(isAPlainAreaPhrase('the forty stock counts')).toBe(false);
  });
  it('refuses a currency mark or a percentage', () => {
    expect(isAPlainAreaPhrase('the $150k pipeline')).toBe(false);
    expect(isAPlainAreaPhrase('churn at 12 percent')).toBe(false);
  });
  it('refuses a date or deadline word', () => {
    expect(isAPlainAreaPhrase('the Friday deadline')).toBe(false);
    expect(isAPlainAreaPhrase('the stock counts due')).toBe(false);
  });
  it('refuses a target verb', () => {
    expect(isAPlainAreaPhrase('hit the stock counts')).toBe(false);
    expect(isAPlainAreaPhrase('achieve the pipeline')).toBe(false);
  });
  it('refuses an empty or an overlong phrase', () => {
    expect(isAPlainAreaPhrase('')).toBe(false);
    expect(isAPlainAreaPhrase('the scheduling and the stock counts and the client relationship and the pipeline and the onboarding')).toBe(false);
  });
});

describe('storedAreaOfAGoal and areaOfGoalOrFallback (read-only, no model call)', () => {
  it('reads what is kept', async () => {
    const prisma: any = { wordedLine: { findUnique: jest.fn(async () => ({ text: 'the scheduling' })) } };
    expect(await storedAreaOfAGoal(prisma, 'Take over the scheduling')).toBe('the scheduling');
  });
  it('is null, and the fallback is fixed, when nothing is kept yet', async () => {
    const prisma: any = { wordedLine: { findUnique: jest.fn(async () => null) } };
    expect(await storedAreaOfAGoal(prisma, 'A new goal')).toBeNull();
    expect(await areaOfGoalOrFallback(prisma, 'A new goal')).toBe(FALLBACK_AREA);
    expect(FALLBACK_AREA).toBe('this part of the work');
  });
  it('never calls the model', async () => {
    const prisma: any = { wordedLine: { findUnique: jest.fn(async () => null) } };
    await areaOfGoalOrFallback(prisma, 'Hit 40 stock counts by Friday');
    /* No anthropic client is even passed in - a TypeError here would mean this tried to ask. */
  });
});

describe('wordTheAreaOfAGoal', () => {
  it('asks once, keeps a valid area, and returns it', async () => {
    const respond = jest.fn(async () => 'the stock counts');
    const upsert = jest.fn(async () => ({}));
    const prisma: any = { wordedLine: { findUnique: jest.fn(async () => null), upsert } };
    const out = await wordTheAreaOfAGoal({ respond }, prisma, 'Hit 40 stock counts by Friday');
    expect(out).toBe('the stock counts');
    expect(respond).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('keeps nothing, and returns null, when the model still names a number', async () => {
    const respond = jest.fn(async () => 'hit 40 stock counts');
    const upsert = jest.fn(async () => ({}));
    const prisma: any = { wordedLine: { findUnique: jest.fn(async () => null), upsert } };
    const out = await wordTheAreaOfAGoal({ respond }, prisma, 'Hit 40 stock counts by Friday');
    expect(out).toBeNull();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('does not ask again once an area is already kept', async () => {
    const respond = jest.fn(async () => 'should not be called');
    const prisma: any = { wordedLine: { findUnique: jest.fn(async () => ({ text: 'the scheduling' })) } };
    const out = await wordTheAreaOfAGoal({ respond }, prisma, 'Take over the scheduling');
    expect(out).toBe('the scheduling');
    expect(respond).not.toHaveBeenCalled();
  });

  it('a failed model call keeps nothing and returns null, never throws', async () => {
    const respond = jest.fn(async () => { throw new Error('rate limited'); });
    const prisma: any = { wordedLine: { findUnique: jest.fn(async () => null) } };
    await expect(wordTheAreaOfAGoal({ respond }, prisma, 'Take over the scheduling')).resolves.toBeNull();
  });
});
