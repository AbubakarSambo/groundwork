import { howTheyAnswered, sayThePlan, theBriefForThePlanner, tidyThePlan, PLAN_PROMPT, PLAN_TOOL } from './the-plan-for-this-session';

/** Hafsah, 20 Sep 2026: read the file before the meeting; know the role, the coaching path and the likely behaviour. */
describe('the plan for this session', () => {
  const raw = {
    mustEstablish: 'Whether Funmi has told Tunde the $400,000 number, or is still assuming he knows.',
    openWith: 'Last time you said Tunde knows what the role is; this is about what you have actually put in front of him.',
    questions: [
      { ask: 'Have you said the $400,000 to Tunde, in writing or out loud?', why: 'the record has the number from her and nothing from him' },
      { ask: 'What did you hand over for the development bank introduction he asked about?', why: 'she said she would get back to him' },
      { ask: 'What have you seen him produce, not attend?', why: 'her evidence so far is presence' },
    ],
    watchFor: [{ pattern: 'answers about Tunde\'s seniority instead of her own action', ifSeen: 'ask what SHE did, once, then take the answer' }],
    coachingPath: { noticed: 'twice said "he knows the role" when asked what she told him', toward: 'named expectations, in writing, with a date', move: 'ask for the one sentence she would say to him this week' },
    doneWhen: 'A yes or no on whether the number has been said to him, and a date if not.',
    doNotAsk: ['his individual figures - not hers to give'],
  };

  it('tidies what comes back and rejects a plan with nothing to establish', () => {
    const plan = tidyThePlan(raw)!;
    expect(plan.questions).toHaveLength(3);
    expect(plan.coachingPath?.toward).toContain('in writing');
    expect(tidyThePlan({ mustEstablish: '', questions: [] })).toBeNull();
    expect(tidyThePlan(null)).toBeNull();
  });

  it('the opener block carries the opening line; a later turn carries where the session has got to', () => {
    const plan = tidyThePlan(raw)!;
    const opener = sayThePlan(plan, [], true);
    expect(opener).toContain('OPEN WITH, then the first question');
    expect(opener).toContain('MUST ESTABLISH: Whether Funmi has told Tunde');
    expect(opener).not.toContain('NEXT IN THE PLAN');
    const later = sayThePlan(plan, [
      { role: 'AI', content: 'Have you said the $400,000 to Tunde, in writing or out loud?' },
      { role: 'PERSON', content: 'No. I have not said the number to him. He is a senior hire.' },
    ], false);
    expect(later).toContain('1. Have you said the $400,000');
    expect(later).toMatch(/1\. Have you said[^\n]*-> (answered|asked once)/);
    expect(later).toContain('NEXT IN THE PLAN, when the current thread is done: What did you hand over');
    expect(later).toContain('WATCH FOR, WITH THIS PERSON:');
    expect(later).toContain('COACHING PATH: noticed twice said');
    expect(later).toContain('DO NOT ASK:');
  });

  it('the brief tells the planner what everything is, and that the lead\'s brief is not the person\'s words', () => {
    const brief = theBriefForThePlanner({
      scenarioLabel: 'NEW_HIRE: Tunde, first quarter', pack: 'MOMENT: a new hire.', sessionNumber: 2, sessionsPlanned: 3, stage: 'middle', oneTime: false,
      person: { firstName: 'Funmi', roleAsDescribed: 'Managing Partner', isLead: true },
      roleMap: { label: 'Leadership', onTrackMeans: 'Named expectations.', goingWrongLooksLike: 'Assumes they know.', protectAgainst: 'Being read as distant.', neutralProbes: ['What have you told them?'], failureSignals: ['Says they know the role'], successSignals: ['Wrote it down'] } as any,
      leadBrief: 'Help the person develop clarity.', recordAlreadyHolds: 'TARGETS: $400,000', doesNotAddUp: '', owed: ['what they have told the people involved'], declinedOrAskedTwice: [],
      earlier: [{ session: 1, type: 'SUCCESS_DEFINITION', text: '$400,000 for his first year' }], patterns: [{ code: 'B2', name: 'Deflects to seniority', observation: 'answers about his level', periods: 2, probe: 'What did you tell him?' }],
      coachingStep: null, howTheyAnswer: '9 answers, 6 words each on average.',
    });
    expect(brief).toContain('THIS IS THE LEAD');
    expect(brief).toContain("THE LEAD'S BRIEF TO THE PRODUCT (an instruction to you, not this person's words)");
    expect(brief).toContain('THE ROLE MAP (Leadership)');
    expect(brief).toContain('seen 2 periods running');
    expect(brief).toContain('- s1 SUCCESS_DEFINITION: $400,000 for his first year');
    expect(PLAN_PROMPT).toContain('invent nothing');
    expect(PLAN_TOOL.input_schema.required).toContain('mustEstablish');
  });

  it('how they have answered is counted, never labelled', () => {
    const turns = ['Fine.', 'All good.', 'N14m, eleven dealers.', "I don't track that.", 'Busy.'];
    const line = howTheyAnswered(turns, (t) => /\d/.test(t), (t) => /don't track/.test(t))!;
    expect(line).toContain('5 answers');
    expect(line).toContain('half or more were six words or fewer');
    expect(line).toContain('1 carried a number');
    expect(line).toContain('1 declined');
    expect(howTheyAnswered(['one', 'two'], () => false, () => false)).toBeNull();
  });
});
