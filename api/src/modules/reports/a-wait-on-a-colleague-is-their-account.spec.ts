import { SEED_PROMPTS } from '../conversation/prompt-library';
import { THE_JUDGEMENT_ROOM_KEY, theJudgementOverARoom, fillTheJudgement, A_WAIT_ON_A_COLLEAGUE_IS_THEIR_ACCOUNT } from './the-judgement-over-the-answers';

/**
 * CHANGE 4, THE MODEL-WRITTEN HALF. "Felix Ndungu is blocked by you" was written by the room judgement
 * (theJudgement.whatTheNumbersSay) from Felix's own words. The words the model is given now say a wait on
 * a colleague or on the lead is the speaker's account, and the version that runs is the stored one.
 * Needs confirming in a quality run when quality testing returns.
 */
describe('a wait on a colleague or the lead is the account of the person who said it', () => {
  const asRun = fillTheJudgement(SEED_PROMPTS.find((s) => s.key === THE_JUDGEMENT_ROOM_KEY)!.content, {
    whoIsReading: 'whoever called this check-in',
    whatTheyAreDeciding: 'what to do next about the people and the work it covers',
    leadName: 'Baraka Otieno',
  });

  it('is seeded as the_judgement_room, so a start stores and activates it, and it is what the model is given', () => {
    expect(SEED_PROMPTS.filter((s) => s.key === 'the_judgement_room')).toHaveLength(1);
    expect(asRun).toBe(theJudgementOverARoom('whoever called this check-in', 'what to do next about the people and the work it covers', 'Baraka Otieno'));
    expect(asRun).toContain(A_WAIT_ON_A_COLLEAGUE_IS_THEIR_ACCOUNT);
  });

  it('tells the model to write it as what they say, and a fact only when the other person confirms it', () => {
    const flat = asRun.replace(/\s+/g, ' ');
    expect(flat).toContain('IS THE ACCOUNT OF THE PERSON WHO SAID IT, NEVER A FACT');
    expect(flat).toContain('"Participant A says Participant A is waiting on Participant B for the Kenya Power contacts."');
    expect(flat).toContain("It is a fact only when the other person's own block confirms it: they said they owe that thing or promised it.");
    expect(flat).toContain('A move about it asks the person who said it what was in their own hands');
  });

  it('gives no example that states a person blocking somebody as a fact', () => {
    expect(asRun).not.toMatch(/\bis (?:also )?blocked by (?:you|Participant [A-Z]|[A-Z][a-z]+ [A-Z][a-z]+)\b/);
    expect(asRun).not.toMatch(/\bis (?:held up|waiting) (?:by|on) you\b/);
  });
});
