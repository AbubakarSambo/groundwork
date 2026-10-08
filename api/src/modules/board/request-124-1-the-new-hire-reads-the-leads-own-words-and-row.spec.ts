import { GroundScenario } from '@prisma/client';
import { AMINA, BARAKA, RUKIA, boardAs, commitment, answered, A_RELEASED_REPORT, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 124, PART 1 (Hafsah's answer of 3 October, decision 88): ON AN ONBOARDING CHECK-IN, THE NEW HIRE READS THEIR LEAD'S OWN
 * WORDS AND ROW (decision 3, decision 4). The lead's private notes and own report stay private. A colleague's words still stay with
 * the manager (decision 17), and a plan, a promotion or a renewal is unchanged.
 *
 * Here Rukia is the new hire, Baraka is a colleague who gave a view, and Amina leads. Read as each of them, and, for the
 * unchanged case, on a renewal. (An admin with no access to the check-in is covered by the decision 60 specs, and is not changed.)
 */
const LEADS_WORDS = 'We agreed 98% on-time delivery.';
const COLLEAGUES_WORDS = 'It is a small matter that comes up in passing.';
const REPORT = {
  ...A_RELEASED_REPORT,
  divergences: [{
    topic: 'They disagree on how serious the handover conflict is.',
    atStake: 'If this holds, the cause may go unaddressed.',
    evidence: [`Participant A's record describes the same discussions as 'operational noise' and not a significant issue.`],
    positions: [
      { participantLabel: 'Participant B', view: 'The handover time moved in March and the trucks still arrive at the old time.' },
      { participantLabel: 'Participant A', view: COLLEAGUES_WORDS },
      { participantLabel: 'the initiator', view: LEADS_WORDS },
    ],
    settledBy: 'Agree on whether the handover conflict is a main cause.',
  }],
};
const RECORD = (more: Partial<Setup> = {}): Setup => ({
  scenario: GroundScenario.NEW_HIRE,
  peersVisibleToEachOther: false,
  checkIns: [answered('p-amina', 1), answered('p-rukia', 1), answered('p-baraka', 1)],
  commitments: [
    commitment('k-amina', 'p-amina', 'I will give Rukia the commercial terms by Friday.', { saidWordForWord: true }),
    commitment('k-rukia', 'p-rukia', 'I will read the renewal files by Monday.', { saidWordForWord: true }),
    commitment('k-baraka', 'p-baraka', 'I will introduce Rukia to the finance team.', { saidWordForWord: true }),
  ],
  lines: [
    { id: 'l-a', participantId: 'p-amina', type: 'COMMITMENT', text: 'I will give Rukia the commercial terms by Friday.', checkIn: { sessionNumber: 1 }, disputedAt: null, verifiability: 'HIGH' },
    { id: 'l-b', participantId: 'p-baraka', type: 'COMMITMENT', text: 'I will introduce Rukia to the finance team.', checkIn: { sessionNumber: 1 }, disputedAt: null, verifiability: 'HIGH' },
  ],
  report: REPORT,
  ...more,
});
const sides = (b: any): string[] => (b.divergence?.items ?? []).flatMap((d: any) => d.positions.map((p: any) => p.view));

describe('request 124 (1): the new hire reads the lead\'s own words', () => {
  it('Rukia reads Amina\'s side word for word, and not a colleague\'s', async () => {
    const views = sides(await boardAs(RECORD(), ...RUKIA));
    expect(views).toContain(LEADS_WORDS);
    expect(views).toContain('The handover time moved in March and the trucks still arrive at the old time.');
    expect(views).not.toContain(COLLEAGUES_WORDS);
    expect(views.join(' ')).not.toMatch(/The words your lead used are not shown to you here/);
    expect(views).toContain("A colleague's own words are not shown to you here. What was found is below.");
  });

  it('Rukia reads Amina\'s row beside her own in "Who checked in", and no colleague\'s', async () => {
    const b = await boardAs(RECORD(), ...RUKIA);
    const rows = (b.checkInGrid?.rows ?? []) as any[];
    expect(rows.map((r) => r.participantId).sort()).toEqual(['p-amina', 'p-rukia']);
    expect((b.participants as any[]).map((p) => p.id).sort()).toEqual(['p-amina', 'p-rukia']);
  });

  it('Rukia is told the board shows her and her lead, because a colleague is left out', async () => {
    const b = await boardAs(RECORD(), ...RUKIA);
    expect(b.whyYouOnlySeeYourself).toBe(
      'On this check-in people give their views without seeing what each other said, so the person-by-person part of this board shows you and your lead. '
      + 'Everything above it is built from everybody and is the same for all of you. '
      + 'That covers where people said the same thing, where they said different things, and the question it turns on.',
    );
  });

  it('with nobody else but the lead, Rukia is told nothing about being left out', async () => {
    const b = await boardAs(RECORD({
      people: [
        { ...require('./the-switchboards-sections-harness').PEOPLE[0] },
        { ...require('./the-switchboards-sections-harness').PEOPLE[1] },
      ],
      checkIns: [answered('p-amina', 1), answered('p-rukia', 1)],
    }), ...RUKIA);
    expect(b.whyYouOnlySeeYourself).toBeUndefined();
  });

  it('Rukia never reads the lead\'s private notes or the lead\'s own report', async () => {
    const served = JSON.stringify(await boardAs(RECORD({ contextItems: [{ kind: 'NOTE', audience: 'LEAD', text: 'Amina privately doubts Rukia can negotiate.' }] }), ...RUKIA));
    expect(served).not.toContain('Amina privately doubts');
    expect(served).toContain('"theJudgement":null');
  });

  it('Baraka, the colleague, still reads what he read before', async () => {
    const views = sides(await boardAs(RECORD(), ...BARAKA));
    expect(views).toContain(LEADS_WORDS);
  });

  it('Amina, who runs it, reads every side as before', async () => {
    const views = sides(await boardAs(RECORD(), ...AMINA));
    expect(views).toEqual(expect.arrayContaining([LEADS_WORDS, COLLEAGUES_WORDS]));
  });
});

/* Changed 8 October (decision 117, D16): the 30 September ruling had taken the lead's words from the person reviewed on a renewal,
   a plan and a promotion; Hafsah's answer is that they read them, as decisions 3 and 6 say. Only a colleague's words stay hidden. */
describe.each([['a renewal', GroundScenario.CONTRACT_RENEWAL], ['a plan', GroundScenario.PIP], ['a promotion', GroundScenario.RECOGNITION]])(
  'decision 117 (D16): on %s the person reviewed reads the manager\'s words too', (_l, scenario) => {
  it('Rukia reads the lead\'s words, and still not a colleague\'s', async () => {
    const views = sides(await boardAs(RECORD({ scenario }), ...RUKIA));
    expect(views).toContain(LEADS_WORDS);
    expect(views).not.toContain(COLLEAGUES_WORDS);
    expect(views).toContain("A colleague's own words are not shown to you here. What was found is below.");
    expect(views.join(' ')).not.toMatch(/The words your lead used are not shown to you here/);
  });
});
