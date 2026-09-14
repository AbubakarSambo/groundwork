import { ENGINE_RULES } from './prompt-library';

/**
 * THE SALES OPENER REACHED SOMEBODY WHO HAD NO PIPELINE.
 *
 * A lead picked "setting objectives and OKRs for my team and tracking progress", said she wanted to
 * sell 500 trucks by the end of the year, and was asked: "what is the most advanced conversation you
 * have right now: the one closest to a decision?"
 *
 * That is the role-specific opener for Sales, and it is a good question for somebody reporting on a
 * pipeline. She was not reporting on anything. She was setting targets for a period that had not
 * started, so there was no conversation to be closest to a decision, and being asked read as not
 * having listened. Her next message said the questions were wrong and it was annoying.
 *
 * The openers are worth keeping. What was missing is the question before them.
 */
describe('the opener fits what they came to do', () => {
  it('asks whether this person is reporting or setting, before reaching for a role opener', () => {
    expect(ENGINE_RULES).toMatch(/reporting.{0,40}setting/is);
    /* And the openers are explicitly the reporting case, not the default. */
    expect(ENGINE_RULES).toMatch(/ROLE-SPECIFIC OPENING \(only when they are reporting/);
  });

  it('names the failure in the words it actually happened in, so nobody re-derives it', () => {
    expect(ENGINE_RULES).toContain('setting shared goals for this period');
    expect(ENGINE_RULES).toMatch(/pipeline they have not started/i);
  });

  it('no longer tells the engine to keep going until a gap is addressed, whatever the person says', () => {
    expect(ENGINE_RULES).not.toContain('Do not proceed until the gap is addressed');
  });

  it('and says plainly that they may decline the alignment question', () => {
    expect(ENGINE_RULES).toMatch(/AND THEY CAN SAY NO/);
    expect(ENGINE_RULES).toMatch(/Do not rephrase it and ask again/);
  });
});

/**
 * TWO SCRIPTS IN ONE CONVERSATION IS NOT TWICE AS THOROUGH.
 *
 * ENGINE_RULES is the base prompt for every conversation and carries a full goal-alignment
 * interview. The situation the lead picks carries its own opening and follow-ups. Both reached the
 * model, so a check-in about setting objectives ran the sales opener from one, the opening from the
 * other, and the alignment step from both. Her words: "the line of questioning does not follow the
 * scenario. It is not aligned with the scenario."
 */
describe('the situation owns the shape', () => {
  it('says the situation prompt runs, and this one is the fallback', () => {
    expect(ENGINE_RULES).toMatch(/SITUATION'S OWN PROMPT COMES FIRST/i);
    expect(ENGINE_RULES).toMatch(/never a second\s+interview running alongside/i);
  });

  it('does not open by handing somebody their own last message back', () => {
    expect(ENGINE_RULES).toMatch(/DO NOT SAY THEIR ANSWER BACK TO THEM/i);
    expect(ENGINE_RULES).toMatch(/repeat and going\s+around in circles/i);
  });

  it('and looks at what they already said before asking for it again', () => {
    expect(ENGINE_RULES).toMatch(/IF THEY HAVE ALREADY TOLD YOU, DO NOT ASK AGAIN/i);
    expect(ENGINE_RULES).toMatch(/already told\s+you in the entry chat/i);
  });
})
