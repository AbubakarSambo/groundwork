import { GroundScenario, GroundMoment, PartyType } from '@prisma/client';
import { THE_FIRST_QUESTION, theSetupPackFor } from './the-first-question-for-this-situation';
import { buildScenarioPackForParty } from '../conversation/prompt-library';
import { buildSetupPrompt } from './entry.service';

/**
 * THE GUARD THAT WOULD HAVE CAUGHT ALL FOUR OF THESE.
 *
 * Four scenarios had written content in prompt-library.ts and no case in the switch that reads it,
 * so they were interviewed with an empty pack. Two of them - BOARD_STRATEGY and COHORT_CHECK - are
 * recorded in a comment in that file, found and fixed by hand. Then ROLE_HANDOVER, CONTRACT_REVIEW
 * and IMPLEMENTATION_TRACKING did the same thing and nobody noticed until this week.
 *
 * That is four times in one file, which is not four mistakes. It is a missing test: everything that
 * checks these packs reads the RECORD or the switch, and a scenario absent from both looks
 * consistent to all of them. So this reads the ENUM - the one place a new situation must be added -
 * and asks whether each value can actually be answered.
 *
 * IT COVERS BOTH HALVES ON PURPOSE. Setup and the check-in are two different conversations with two
 * different jobs, and a situation can now be specific in one and generic in the other. The bug that
 * started this was exactly that shape: NEW_HIRE's check-in question was written and good, and setup
 * asked "what is the situation about" ten minutes earlier to somebody who had just clicked "A new
 * hire starting".
 */
const EVERY_SITUATION = Object.values(GroundScenario);

describe('every situation asks its own question', () => {
  it('found the enum, or this proves nothing', () => {
    expect(EVERY_SITUATION.length).toBeGreaterThan(20);
  });

  it('has a first question for setup', () => {
    const missing = EVERY_SITUATION.filter((s) => !THE_FIRST_QUESTION[s]?.ask?.trim());
    expect(missing).toEqual([]);
  });

  it('and says what that question has to establish, so the model knows when to stop asking it', () => {
    const missing = EVERY_SITUATION.filter((s) => !THE_FIRST_QUESTION[s]?.until?.trim());
    expect(missing).toEqual([]);
  });

  it('asks something no other situation would ask', () => {
    /*
     * THE ACTUAL TEST OF THE WHOLE CHANGE. Twenty-two distinct questions, or some cards are still
     * sharing an opener and the complaint stands for those. Duplicates are what this catches:
     * copy-pasting a neighbour's line is how a list like this decays.
     */
    const asked = EVERY_SITUATION.map((s) => THE_FIRST_QUESTION[s].ask.trim().toLowerCase());
    expect(new Set(asked).size).toBe(asked.length);
  });

  it('and never asks the generic one, which is the question they answered by clicking', () => {
    const generic = /what is (this|the situation) (about|for)\b/i;
    const lazy = EVERY_SITUATION.filter(
      (s) => s !== GroundScenario.OPEN_READ && generic.test(THE_FIRST_QUESTION[s].ask),
    );
    expect(lazy).toEqual([]);
  });

  it('has a check-in pack too, which is where the last four holes were', () => {
    const empty = EVERY_SITUATION.filter(
      (s) => !buildScenarioPackForParty(s, PartyType.INITIATOR, null).trim(),
    );
    expect(empty).toEqual([]);
  });

  it('and one for the other side of it as well', () => {
    const empty = EVERY_SITUATION.filter(
      (s) => !buildScenarioPackForParty(s, PartyType.PARTICIPANT, null).trim(),
    );
    expect(empty).toEqual([]);
  });
});

describe('the block that reaches the prompt', () => {
  it('carries the situation question and forbids asking the generic one', () => {
    const pack = theSetupPackFor(GroundScenario.NEW_HIRE);
    expect(pack).toContain('Who is the new hire, and what did you bring them in to do?');
    expect(pack).toMatch(/Do NOT ask them what the situation is about/);
    expect(pack).toMatch(/the click went nowhere/);
  });

  it('is empty when nothing has been picked, rather than confidently wrong', () => {
    /*
     * THE FAILURE THIS PREVENTS. `resolveScenario` defaults to NEW_PROJECT, so an absent scenario
     * routed through it would open with "What is the project, and who is on it?" to somebody who
     * never mentioned a project. A confidently wrong first question is worse than the generic one.
     */
    expect(theSetupPackFor(null)).toBe('');
    expect(theSetupPackFor(undefined)).toBe('');
  });

  it('asks a group being onboarded a different question from a group being read', () => {
    const onboarding = theSetupPackFor(GroundScenario.COHORT_CHECK, GroundMoment.STARTING);
    const ongoing = theSetupPackFor(GroundScenario.COHORT_CHECK, null);
    expect(onboarding).toContain('Who is starting, and what are they each starting on?');
    expect(ongoing).not.toContain('Who is starting, and what are they each starting on?');
  });
});

describe('and it reaches the prompt the model is actually given', () => {
  /*
   * READ AT THE ASSEMBLED PROMPT, NOT AT THE PIECES. The bug being fixed was two correct pieces
   * that never met: a good NEW_HIRE question in one file, an endpoint in another that was never
   * told which situation it was setting up. Both pieces would have passed a test of themselves.
   */
  const base = 'BASE PROMPT';

  it('appends the situation to the general rules, rather than replacing them', () => {
    const prompt = buildSetupPrompt(base, 'NEW_HIRE');
    expect(prompt.startsWith(base)).toBe(true);
    expect(prompt).toContain('Who is the new hire, and what did you bring them in to do?');
  });

  it('takes the label the picker sends as well as the enum value', () => {
    /* Both doors send a key today, but the entry chat has historically sent a card label through
       SCENARIO_MAP, and a silently unmatched value would put the generic question back. */
    expect(buildSetupPrompt(base, 'PIP')).toContain('Who is it, and what were they meant to be delivering?');
  });

  it('leaves the prompt alone for a situation nobody has picked', () => {
    expect(buildSetupPrompt(base)).toBe(base);
  });

  it('leaves it alone for a value it does not recognise, instead of guessing a situation', () => {
    /*
     * `resolveScenario` would answer NEW_PROJECT here, which is right when a ground has to be
     * created and wrong when a question has to be asked: it would open with "What is the project,
     * and who is on it?" to somebody who never mentioned a project.
     */
    expect(buildSetupPrompt(base, 'A_SITUATION_THAT_DOES_NOT_EXIST')).toBe(base);
  });
});
