import { GroundScenario, PartyType } from '@prisma/client';
import { buildIntakeBlock } from './prompt-library';
import { theBriefForThePlanner } from './the-plan-for-this-session';

/**
 * RELEASE TEST, 22 NOVEMBER 2026, BUG N3. Sade's first check-in on "Sales team, Q4" opened "This takes about ten minutes. You can stop any time. Moment: Setting
 * goals and keeping track of how the work is going." The goals pack begins "MOMENT: Setting goals and keeping track of how the work is going.", and it was given
 * to the model bare, right after "open with one sentence that names what this ground is for", so the model said its first line, label and all. The pack now
 * reaches every model that reads it (the conversation, and the session's planner, which writes the opening) as notes whose labels are never said.
 */
const THE_GUIDE = 'THE GUIDE TO THIS SITUATION. These are notes for you, not words to say. The capital-letter labels in them, such as MOMENT, PURPOSE and OPENING, name the parts of the notes and are never said to the person.';

describe("a situation's labels are never said", () => {
  it('in the conversation, for a team member in her first check-in and for a later one, the goals pack comes as notes', () => {
    for (const sessionNumber of [1, 3]) {
      const said = buildIntakeBlock({ scenario: GroundScenario.OKR_ALIGNMENT, partyType: PartyType.PARTICIPANT, sessionNumber, totalSessions: 4 } as never);
      const guide = said.indexOf(THE_GUIDE);
      expect(guide).toBeGreaterThan(-1);
      expect(said.indexOf('MOMENT: Setting goals and keeping track of how the work is going.')).toBeGreaterThan(guide);
    }
  });

  it('a pack stored as a PromptVersion row comes the same way', () => {
    const said = buildIntakeBlock({ scenario: GroundScenario.OKR_ALIGNMENT, partyType: PartyType.PARTICIPANT, sessionNumber: 1, totalSessions: 4, scenarioPackOverride: 'MOMENT: A stored pack.\n\nOPENING: Ask what they aim for.' } as never);
    expect(said).toContain(`${THE_GUIDE} Say what you need from them in your own plain words.\n\nMOMENT: A stored pack.`);
  });

  it('in the brief to the planner, which writes how the check-in opens', () => {
    const brief = theBriefForThePlanner({
      scenarioLabel: 'setting goals, called "Sales team, Q4"', pack: 'MOMENT: Setting goals and keeping track of how the work is going.', sessionNumber: 1, sessionsPlanned: 4, stage: 'first', oneTime: false,
      person: { firstName: 'Sade', roleAsDescribed: null, isLead: false }, roleMap: null, leadBrief: null, recordAlreadyHolds: '', doesNotAddUp: '', owed: [], declinedOrAskedTwice: [],
      earlier: [], patterns: [], coachingStep: null, howTheyAnswer: null,
    } as never);
    expect(brief).toContain(`${THE_GUIDE} Say what you need from them in your own plain words.\n\nMOMENT: Setting goals`);
    expect(brief).not.toContain("THE SCENARIO'S OWN GUIDANCE");
  });
});
