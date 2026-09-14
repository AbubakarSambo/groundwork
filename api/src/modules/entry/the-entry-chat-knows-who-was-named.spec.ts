import { GroundScenario, PartyType } from '@prisma/client';
import { buildEntrySystemPrompt } from './entry.service';

/**
 * "WHO ELSE IS INVOLVED IN THIS PROJECT?" - ASKED AFTER BEING TOLD THREE TIMES.
 *
 * Walked in a browser. The lead said "Three of us: me running it, Tomi on engineering, Zainab on
 * marketing" during setup, listed what each of them owned two turns later, and got that back.
 *
 * THE RULE FOR THIS WAS ALREADY IN THE ENTRY PROMPT and is precise: "if that person has already
 * been named or identified earlier in the conversation, do not ask again... Do not ask about the
 * same person twice." It was not enough. That is the third instruction-only rule to fail in one
 * evening, next to "never say it is on the record" and "do not invent a handoff from a general
 * complaint" - both of which were also written down, and both of which happened anyway.
 *
 * WHAT THE SIGNED-IN CHECK-IN HAS THAT THIS DID NOT. `alreadyEstablished` - a block that STATES the
 * settled facts and says not to ask for them, placed high in the prompt. It was written for exactly
 * this bug. I did not see the fault on the signed-in side in the same walk, which is the evidence
 * that it works. The entry chat simply never got it: this function only ever knew the situation and
 * the label, so the names had nowhere to travel.
 */
describe('the entry chat knows who setup named', () => {
  const withPeople = (people?: string[]) =>
    buildEntrySystemPrompt(GroundScenario.OKR_ALIGNMENT, 'The onboarding rewrite', PartyType.INITIATOR, undefined, people);

  it('states the people, and says not to ask for them', () => {
    const prompt = withPeople(['Tomi', 'Zainab']);
    expect(prompt).toContain('The other people in it are: Tomi, Zainab.');
    expect(prompt).toContain('DO NOT ASK FOR ANY OF IT');
  });

  it('and the block sits above the pathway that would otherwise ask', () => {
    /*
     * Position is the point. The scenario pack carries a written opener that was authored without
     * knowing setup would collect anything, and the block has to outrank it - which it only does if
     * the model reads it first.
     */
    const prompt = withPeople(['Tomi']);
    expect(prompt.indexOf('DO NOT ASK FOR ANY OF IT'))
      .toBeLessThan(prompt.indexOf('# Entry session context'));
  });

  it('changes nothing when setup named nobody', () => {
    /* A lead who has not named anyone yet SHOULD be asked. The block must not appear empty-handed. */
    const prompt = withPeople([]);
    expect(prompt).not.toContain('The other people in it are');
    expect(withPeople(undefined)).toBe(prompt);
  });

  it('and blank entries are not people', () => {
    expect(withPeople(['Tomi', '   ', ''])).toContain('The other people in it are: Tomi.');
  });
});
