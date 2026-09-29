import { buildIntakeBlock } from './prompt-library';

/**
 * DECISION 56, ITEM 2: the model in the person's own check-in is given the goal, so it can ask about
 * that work, but never the number or the target until the lead has told them. `theAreaOfAGoal` (in
 * grounds/a-goal-not-told-stays-with-the-lead.ts) strips the number before conversation.service.ts
 * ever builds this block; `notToldYetAreaOnly` is what tells `describeObjective` to render it as an
 * area to ask about rather than the ordinary sentence.
 */
const base: any = {
  groundLabel: 'First 90 days',
  scenario: 'NEW_HIRE',
  partyType: 'PARTICIPANT',
  sessionNumber: 2,
  totalSessions: 5,
};

describe('a goal the lead has not told them about, in the intake block', () => {
  it('gives the area of work, never the full sentence with its number', () => {
    const out = buildIntakeBlock({
      ...base,
      personObjectives: [{
        text: 'Hit stock counts', // already reduced upstream, as conversation.service.ts does it
        authoredBy: 'lead',
        authoredByThem: false,
        seenBySubject: false,
        notToldYetAreaOnly: true,
      }],
    });
    expect(out).toContain('Hit stock counts');
    expect(out).not.toMatch(/\b40\b/);
  });

  it('tells the model to ask about the work and never say a goal or number exists', () => {
    const out = buildIntakeBlock({
      ...base,
      personObjectives: [{
        text: 'Take over the scheduling',
        authoredBy: 'lead',
        authoredByThem: false,
        seenBySubject: false,
        notToldYetAreaOnly: true,
      }],
    });
    expect(out).toMatch(/NEVER say or imply that a goal, target or number has been set/);
    expect(out).toMatch(/ASK ABOUT THIS WORK NATURALLY/);
  });

  it('an ordinary goal (not flagged) still reads exactly as before', () => {
    const out = buildIntakeBlock({
      ...base,
      personObjectives: [{
        text: 'Lead the client conversations fully',
        authoredBy: 'self',
        authoredByThem: true,
        seenBySubject: true,
      }],
    });
    expect(out).toContain('Lead the client conversations fully');
    expect(out).not.toMatch(/ASK ABOUT THIS WORK NATURALLY/);
  });
});
