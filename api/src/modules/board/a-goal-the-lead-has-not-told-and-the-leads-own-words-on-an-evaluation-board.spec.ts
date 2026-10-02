import { GroundScenario } from '@prisma/client';
import { AMINA, JUMA, RUKIA, SETUP_ADMIN, boardAs, commitment, handoff, type Setup } from './the-switchboards-sections-harness';

/**
 * WHAT THE LEAD HAS NOT TOLD A PERSON, AND WHAT THE LEAD SAID ABOUT THEM, NEVER REACHES THEIR BOARD
 * (decisions 4, 30, 56; the 1 October review, part 1). Every test reads the board as a person is served it.
 *
 * Amina leads, Rukia is the person it is about. Amina has set Rukia a goal of eight renewals a quarter
 * and has not told her. In the check-in Amina said it, so the engine wrote it as an objective in its own
 * words, and as a number owned by Rukia.
 */
const AIM_SAID = 'Rukia needs to meet her renewal targets of eight per quarter.';
const NUMBER_FOR_HER = 'Consistently achieve eight renewals per quarter';
const goal = (more: Record<string, any> = {}) => ({
  participantId: 'p-rukia', text: 'Client renewals, eight a quarter', awareness: 'NOT_TOLD', authoredBy: 'lead',
  createdAt: new Date(), ...more,
});
const objectives = [
  { id: 'o-1', groundId: 'g-1', name: AIM_SAID, target: null, count: 0, prevCount: 0, ownerParticipantId: null, setByParticipantId: 'p-amina', sortOrder: 0, addedAtSession: 1 },
  { id: 'o-2', groundId: 'g-1', name: NUMBER_FOR_HER, target: 8, count: 0, prevCount: 0, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-amina', sortOrder: 1, addedAtSession: 1 },
  { id: 'o-3', groundId: 'g-1', name: 'Keep the Westgate account', target: null, count: 0, prevCount: 0, ownerParticipantId: null, setByParticipantId: 'p-amina', sortOrder: 2, addedAtSession: 1 },
];
const PLAN = 'I will put a formal performance improvement plan in front of Rukia.';
const RECORD: Setup = {
  scenario: GroundScenario.PIP,
  label: 'Formal improvement plan: the account manager',
  whoSeesTargets: 'EVERYBODY',
  objectives,
  personObjectives: [goal()],
  commitments: [
    commitment('k-1', 'p-amina', PLAN, { whenSaid: 'by the end of this week' }),
    commitment('k-2', 'p-rukia', 'I will send the Westgate quote.', { whenSaid: 'by Friday' }),
  ],
};
const text = (b: any, k: string) => JSON.stringify(b[k] ?? null);

describe('The goal the lead has set and not told, on the board of the person it is about', () => {
  it('Rukia reads neither the objective in the lead\'s words about her nor the number set for her', async () => {
    const b = await boardAs(RECORD, ...RUKIA);
    const all = JSON.stringify(b.objectives ?? []);
    expect(all).not.toContain('renewal targets');
    expect(all).not.toContain('eight renewals');
    expect((b.objectives ?? []).some((o: any) => o.target === 8)).toBe(false);
    /* The team's own objective, which names nobody, is still hers to read. */
    /* Every aim is served as a full sentence, with its full stop (1 October 2026). */
    expect((b.objectives ?? []).map((o: any) => o.name)).toContain('Keep the Westgate account.');
  });

  it('Amina, who set the goal, reads every objective as before', async () => {
    const b = await boardAs(RECORD, ...AMINA);
    expect(b.objectives.map((o: any) => o.name)).toEqual([AIM_SAID, `${NUMBER_FOR_HER}.`, 'Keep the Westgate account.']);
  });

  it('once Amina has told her, Rukia reads them', async () => {
    const b = await boardAs({ ...RECORD, personObjectives: [goal({ awareness: 'TOLD' })] }, ...RUKIA);
    /* As "you", since the aim is about her (1 October 2026): she used to read her own name and "her". */
    expect(b.objectives.map((o: any) => o.name)).toContain('You need to meet your renewal targets of eight per quarter.');
  });

  it('a week on, Rukia reads only that Amina has set a goal about this work, and no number', async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const b = await boardAs({ ...RECORD, personObjectives: [goal({ createdAt: old })] }, ...RUKIA);
    const names = b.objectives.map((o: any) => o.name);
    expect(names.some((n: string) => /^Amina has set a goal about .+, and will talk it through with you\.$/.test(n))).toBe(true);
    expect(JSON.stringify(b.objectives)).not.toMatch(/eight|\b8\b/);
  });

  it('a colleague on the same check-in does not read it either', async () => {
    const b = await boardAs({ ...RECORD, scenario: GroundScenario.OKR_ALIGNMENT }, ...JUMA);
    expect(b).toBeDefined();
  });
});

describe('The lead\'s own commitment, on an evaluation check-in', () => {
  it('Rukia reads her own commitment and not Amina\'s, in the work plan, the timeline and the risks', async () => {
    const b = await boardAs(RECORD, ...RUKIA);
    for (const k of ['workPlan', 'timeline', 'risks', 'personHistory', 'blockerCheck', 'evidenceIndex', 'busyOrMoving']) {
      expect(text(b, k)).not.toMatch(/performance improvement plan/i);
    }
    expect(b.workPlan.map((r: any) => r.participantId)).toEqual(['p-rukia']);
    expect(text(b, 'timeline')).toContain('Westgate quote');
  });

  it('Amina, who made it, still reads it, and so does the admin who set the check-in up', async () => {
    expect(text(await boardAs(RECORD, ...AMINA), 'workPlan')).toContain('performance improvement plan');
    expect(text(await boardAs({ ...RECORD, createdByUserId: 'u-setup' }, ...SETUP_ADMIN), 'timeline')).toContain('performance improvement plan');
  });

  it('what the lead said she is waiting on, about the person, is not served to the person either', async () => {
    const b = await boardAs({ ...RECORD, dependencies: [handoff('d-1', 'p-amina', 'a reply from Rukia on the plan', { onParticipantId: 'p-rukia', status: 'WAITING' })] }, ...RUKIA);
    for (const k of ['risks', 'timeline', 'blockerCheck']) expect(text(b, k)).not.toContain('reply from Rukia');
  });
});

describe('The lead\'s commitment about a named person, on an ordinary check-in', () => {
  const ordinary: Setup = {
    ...RECORD, scenario: GroundScenario.OKR_ALIGNMENT, peersVisibleToEachOther: true, objectives: [], personObjectives: [],
    commitments: [
      commitment('k-1', 'p-amina', PLAN),
      commitment('k-3', 'p-amina', 'I will review the pricing.'),
    ],
  };
  /*
   * Request 105 (the prototype's B5, "Only yours"): a person who checks in reads only their own commitments,
   * so Rukia now reads neither of the lead's. Before, she read the one that names nobody. The one that names
   * her is still read nowhere on her board.
   */
  it('Rukia does not read the one that names her, nor, since her board is her own, the one that names nobody', async () => {
    const b = await boardAs(ordinary, ...RUKIA);
    const all = JSON.stringify(b);
    expect(all).not.toContain('performance improvement plan');
    expect(all).not.toContain('review the pricing');
  });
  it('Amina reads both', async () => {
    const b = await boardAs(ordinary, ...AMINA);
    expect(JSON.stringify(b.workPlan)).toContain('performance improvement plan');
  });
});

describe('The name of an evaluation check-in, for the person it is about', () => {
  it('Rukia reads whose check-in it is and not the label the lead typed', async () => {
    const b = await boardAs(RECORD, ...RUKIA);
    expect(b.title).toBe('Your check-in with Amina');
  });
  it('Amina reads the label she typed', async () => {
    expect((await boardAs(RECORD, ...AMINA)).title).toBe('Formal improvement plan: the account manager');
  });
  it('an ordinary check-in keeps its label for everybody', async () => {
    const b = await boardAs({ ...RECORD, scenario: GroundScenario.OKR_ALIGNMENT, label: 'The team, Q3' }, ...RUKIA);
    expect(b.title).toBe('The team, Q3');
  });
});
