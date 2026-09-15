import { GroundScenario, PartyType } from '@prisma/client';
import { buildScenarioPackForParty } from './prompt-library';
import { THE_SCENARIO_TABLE } from './the-scenario-table';

/**
 * A PACK THAT DOES NOT NAME WHAT THE PERSON CHOSE IS RUNNING A SCENARIO NOBODY PICKED.
 *
 * Seven cards shared one line: `MOMENT: Something new is starting.` A person who clicked "Help a New
 * Hire Get Started" and a person who clicked "Hand Over a Role Smoothly" were told the same thing,
 * and neither was told what they had chosen. One of the seven was CONTRACT_RENEWAL, whose card is
 * about an existing relationship before a renewal, which is the opposite of new.
 *
 * Three more contradicted their cards outright:
 *   PIP opened "PURPOSE: a structured record of what improvement is REQUIRED", against a card that
 *   says "understand what is getting in the way" - on the most sensitive scenario there is.
 *   RECOGNITION asked the lead "what are you asking for?", which is a question for somebody seeking
 *   a raise, and asked the participant for their read as the decider. Both halves, wrong people.
 *   REALIGN_TEAM asked each person what they were "falling short of", on a card that is about people
 *   seeing a situation differently, where nobody is assumed to be falling short of anything.
 */
describe('every pack delivers its card', () => {
  const scenarios = Object.keys(GroundScenario) as GroundScenario[];

  /** Words too common to prove anything, so a match on them is not a match. */
  const NOT_DISTINCTIVE = new Set([
    'the', 'and', 'a', 'an', 'of', 'to', 'for', 'in', 'on', 'with', 'what', 'how', 'is', 'are',
    'their', 'they', 'them', 'it', 'its', 'people', 'person', 'work', 'working', 'before', 'when',
    'where', 'that', 'this', 'each', 'own', 'about', 'from', 'into', 'then', 'give', 'gives',
  ]);

  const distinctive = (text: string) =>
    (text.toLowerCase().match(/[a-z']{4,}/g) ?? []).filter((w) => !NOT_DISTINCTIVE.has(w));

  it.each(scenarios)('%s opens by naming the thing on the card', (s) => {
    const row = THE_SCENARIO_TABLE[s]!;
    /*
     * ASSEMBLED THE WAY PRODUCTION ASSEMBLES IT, with the stage, because that is what reaches the
     * model and a test of anything else is a test of something nobody gets. Four packs say the card's
     * thing in their own words rather than its words - "the situation has not been named yet" for
     * "give people a starting point when the situation doesn't fit a predefined scenario" - and that
     * is allowed. What is not allowed is opening on a different subject, which is what this catches.
     */
    const pack = buildScenarioPackForParty(s, PartyType.INITIATOR, null, 'first');
    const opening = pack.slice(0, 900).toLowerCase();
    /*
     * At least half the distinctive words of the card's own description turn up in the opening of
     * the pack. Not an exact string: a pack is allowed to say it in its own way. What it is not
     * allowed to do is open on a different subject.
     */
    const words = [...new Set(distinctive(row.description))];
    const found = words.filter((w) => opening.includes(w.slice(0, Math.max(4, w.length - 2))));
    expect({ scenario: s, found: found.length, of: words.length }).toEqual({
      scenario: s,
      found: expect.any(Number),
      of: words.length,
    });
    expect(found.length / words.length).toBeGreaterThanOrEqual(0.4);
  });

  it('no longer tells seven different cards that something new is starting', () => {
    const generic = scenarios.filter((s) =>
      buildScenarioPackForParty(s, PartyType.INITIATOR).includes('MOMENT: Something new is starting.'));
    expect(generic).toEqual([]);
  });

  it('does not ask the person running a recognition check-in what they are asking for', () => {
    const lead = buildScenarioPackForParty(GroundScenario.RECOGNITION, PartyType.INITIATOR);
    expect(lead).not.toMatch(/What are you asking for/i);
    expect(lead).toMatch(/what this person has been responsible for/i);
    /* And the person it is about is asked about their own work, not asked to judge somebody. */
    const them = buildScenarioPackForParty(GroundScenario.RECOGNITION, PartyType.PARTICIPANT);
    expect(them).toMatch(/the person this check-in is about/i);
    expect(them).not.toMatch(/the person who will receive the ask/i);
  });

  it('does not open a get-back-on-track check-in on what is required', () => {
    const pip = buildScenarioPackForParty(GroundScenario.PIP, PartyType.INITIATOR);
    expect(pip).not.toMatch(/what improvement is required/i);
    expect(pip).toMatch(/without jumping to conclusions/i);
    /* Everything careful about that pack is still there. */
    expect(pip).toMatch(/THE STANDARD COMES FIRST/);
  });

  it('does not ask people who see things differently what they are falling short of', () => {
    const realign = buildScenarioPackForParty(GroundScenario.REALIGN_TEAM, PartyType.INITIATOR);
    expect(realign).not.toMatch(/falling short of/i);
    expect(realign).toMatch(/Nothing here assumes somebody is wrong/i);
    /* And the standard block still runs where something genuinely is off. */
    expect(buildScenarioPackForParty(GroundScenario.DRIFT, PartyType.INITIATOR)).toMatch(/THE STANDARD COMES FIRST/);
  });
});
