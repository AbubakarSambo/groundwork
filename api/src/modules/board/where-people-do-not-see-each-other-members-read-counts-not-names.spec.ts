import { GroundScenario, PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, BARAKA, type Setup } from './the-switchboards-sections-harness';

/**
 * DECISION 121, ITEM 5. Where people in a check-in do not see each other, a member may read a count ("2 of 3 have answered") and
 * never a name. Both members here are served the whole board; neither may read the other's first or last name, however the record
 * mentions them (a promise, a wait, a quote, a count). The lead reads names, as before.
 */
const PEOPLE = [
  person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR),
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
  person('p-zawadi', 'u-zawadi', 'Zawadi', 'Njeri'),
];

function cohort(over: Partial<Setup> = {}): Setup {
  return {
    scenario: GroundScenario.COHORT_CHECK,
    peersVisibleToEachOther: false,
    people: PEOPLE,
    checkIns: [answered('p-rukia', 1), answered('p-baraka', 1), { id: 'c1-z', participantId: 'p-zawadi', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null }],
    commitments: [
      commitment('k1', 'p-rukia', 'I will send the deck to the client.'),
      commitment('k2', 'p-baraka', 'I will call the supplier.'),
    ],
    dependencies: [
      handoff('d1', 'p-baraka', 'the price list', { onParticipantId: 'p-rukia', status: 'WAITING' }),
      handoff('d2', 'p-zawadi', 'the sales deck', { onParticipantId: 'p-baraka', status: 'BLOCKING' }),
    ],
    ...over,
  };
}

const NAMES: Record<string, string[]> = { 'u-rukia': ['Rukia', 'Mwangi'], 'u-baraka': ['Baraka', 'Otieno'], 'u-zawadi': ['Zawadi', 'Njeri'] };

describe('where people do not see each other, a member reads counts and never names', () => {
  it('Rukia reads neither Baraka nor Zawadi anywhere on the board', async () => {
    const b = await boardAs(cohort(), ...RUKIA);
    const text = JSON.stringify(b);
    for (const n of [...NAMES['u-baraka'], ...NAMES['u-zawadi']]) expect(text).not.toContain(n);
  });

  it('Baraka reads neither Rukia nor Zawadi anywhere on the board', async () => {
    const b = await boardAs(cohort(), ...BARAKA);
    const text = JSON.stringify(b);
    for (const n of [...NAMES['u-rukia'], ...NAMES['u-zawadi']]) expect(text).not.toContain(n);
  });

  it('the count is still there, so a member can see how many have checked in', async () => {
    const b = await boardAs(cohort(), ...RUKIA);
    expect(b.howItIsGoing.glance.progress).toMatchObject({ answeredThisRound: 2 });
    expect(typeof b.howItIsGoing.glance.progress.ofPeople).toBe('number');
  });

  it('Amina, who runs it, still reads the names', async () => {
    const text = JSON.stringify(await boardAs(cohort(), ...AMINA));
    expect(text).toContain('Baraka');
    expect(text).toContain('Rukia');
  });
});
