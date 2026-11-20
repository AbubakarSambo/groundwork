import { PartyType } from '@prisma/client';
import { forTheLeadFrom, type Reader } from './what-today-reads-from-the-record';

/**
 * A DIFFERENCE THAT IS ONLY A TARGET SAID AGAIN IS NOT ONE, ON TODAY AND THE WEEKLY REPORT TOO (Hafsah's points 9 and 25, 18
 * October). The board stopped reading Grace's 40 each against the reps naming the team's 120 as a difference (point 9), but her
 * Today list and her weekly report's "For you to do next week" still read "Confirm the individual sales target for each person."
 * These are the two differences the test bed's report holds, word for word, read as Grace's list is built.
 */
const person = (id: string, userId: string, partyType: PartyType, first: string, last: string, t: number) => ({
  id, userId, partyType, email: null, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date(2026, 9, 1, 0, t), user: { firstName: first, lastName: last },
});
const GRACE = person('p-grace', 'u-grace', PartyType.INITIATOR, 'Grace', 'Achieng', 0);
const KEVIN = person('p-kevin', 'u-kevin', PartyType.PARTICIPANT, 'Kevin', 'Omondi', 1);
const MERCY = person('p-mercy', 'u-mercy', PartyType.PARTICIPANT, 'Mercy', 'Wairimu', 2);
const JOSEPH = person('p-joseph', 'u-joseph', PartyType.PARTICIPANT, 'Joseph', 'Kariuki', 3);
const PEOPLE = [GRACE, KEVIN, MERCY, JOSEPH];

const DIVERGENCES = [
  {
    topic: 'How sales are counted and tracked against the overall team goal.',
    atStake: 'If this holds, the team cannot know if it is on track to meet the 120-unit goal, regardless of individual effort.',
    positions: [
      { view: 'Defines a completed sale as one confirmed by a signed order or proof of payment.', participantLabel: 'the initiator' },
      { view: 'Reported a target of 40 units in one check-in, 120 units in another, and later a specific sale of 3 units.', participantLabel: 'Participant A' },
      { view: '', participantLabel: 'Participant B' },
      { view: 'Reported a personal sales target of 120 units.', participantLabel: 'Participant C' },
    ],
    settledBy: "Agree on one consistent way to define and count a 'sale' for reporting purposes.",
  },
  {
    topic: 'The individual sales target for each team member.',
    atStake: "If this continues, effort may be misaligned with the team's plan, and performance is measured against different benchmarks.",
    positions: [
      { view: 'Stated that each of the three participants is responsible for selling 40 units.', participantLabel: 'the initiator' },
      { view: "Stated that Participant A's own target is 120 units.", participantLabel: 'Participant A' },
      { view: 'Stated that hitting a target of 120 units would mean Participant C is doing well.', participantLabel: 'Participant C' },
    ],
    settledBy: 'Confirm the individual sales target for each person.',
  },
];

const OBJECTIVES = [
  { id: 'o-team', name: 'Units sold by 30 October', target: 120, ownerParticipantId: null },
  { id: 'o-kevin', name: 'units sold by 30 October', target: 40, ownerParticipantId: 'p-kevin' },
  { id: 'o-mercy', name: 'units sold by 30 October', target: 40, ownerParticipantId: 'p-mercy' },
  { id: 'o-joseph', name: 'units sold by 30 October', target: 40, ownerParticipantId: 'p-joseph' },
];

function theListFor(kindOfWork: string | null, switchOn: boolean, mark = false) {
  const ground = { initiatorId: 'u-grace', organizationId: 'org', kindOfWork, whoSeesTargets: 'THEIR_OWN', participants: PEOPLE, dependencies: [], objectives: OBJECTIVES, personObjectives: [] };
  const prisma: any = {
    report: { findUnique: jest.fn(async () => ({ divergences: DIVERGENCES })) },
    checkIn: { findMany: jest.fn(async () => [{ participantId: 'p-kevin' }, { participantId: 'p-joseph' }, { participantId: 'p-mercy' }]) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: switchOn })) },
    groundContextItem: { findMany: async () => [] },
    wordedLine: { findUnique: async () => null },
  };
  const reader: Reader = { userId: 'u-grace', isAdmin: false };
  return forTheLeadFrom(prisma, 'g1', { ground, participants: PEOPLE, checkIns: [], nameOf: (pid: string) => PEOPLE.find((p) => p.id === pid)?.user.firstName ?? 'a colleague' } as any, reader, 8, { markTargetsSaidAgain: mark });
}

describe('Grace\'s list of what only she can settle, on a sales check-in with Release 1\'s switch on', () => {
  it('has no difference between her 40 each and the team\'s 120 said again, and keeps the one about how a sale is counted', async () => {
    const out = (await theListFor('sales team', true))!;
    const decide = out.map((x) => x.decide);
    expect(decide).toContain("Agree on one consistent way to define and count a 'sale' for reporting purposes.");
    expect(decide).not.toContain('Confirm the individual sales target for each person.');
    expect(JSON.stringify(out)).not.toMatch(/onlyATargetSaidAgain/);
  });

  it('names only the people who said something: Mercy, whose side on the report is empty, is not one of them', async () => {
    const out = (await theListFor('sales team', true))!;
    const why = out.find((x) => x.decide.startsWith('Agree on one consistent way'))!.why;
    expect(why).toBe('How sales are counted and tracked against the overall team goal. You, Kevin Omondi and Joseph Kariuki said different things about this.');
  });

  it('the weekly report keeps it marked when it is built, so its read decides by the switch', async () => {
    const out = (await theListFor('sales team', true, true))!;
    const marked = out.filter((x) => x.onlyATargetSaidAgain).map((x) => x.decide);
    expect(marked).toEqual(['Confirm the individual sales target for each person.']);
  });
});

describe('with the switch off, or on a check-in that is not sales', () => {
  it('Grace reads both differences, as before', async () => {
    for (const [kind, on] of [['sales team', false], [null, true]] as const) {
      const decide = (await theListFor(kind, on))!.map((x) => x.decide);
      expect(decide).toEqual(expect.arrayContaining([
        "Agree on one consistent way to define and count a 'sale' for reporting purposes.",
        'Confirm the individual sales target for each person.',
      ]));
    }
  });
});
