import { GroundScenario, PartyType } from '@prisma/client';
import { boardAs, person, answered, commitment, AMINA, RUKIA, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * DECISION 121, ITEM 7. An admin who takes part in a check-in is, inside that check-in, a person who takes part: she reads exactly what a
 * participant reads (no lead's brief, aims, private notes or lead-only sections), unless she also runs it. Everywhere else she is an admin.
 *
 * Juma is an admin of the organisation and one of the people who check in. The same board is read as Juma (an admin), as Juma with the
 * role of an ordinary member, as Amina who runs it, and as another admin who is not in it.
 */
const target = (id: string, name: string, n: number, owner: string | null, setBy: string | null) => ({
  id, groundId: 'g-1', name, target: n, count: 1, prevCount: 1, ownerParticipantId: owner, setByParticipantId: setBy,
  direction: null, isADecisionAboutAPerson: false, sortOrder: owner ? 1 : 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null,
});
const PEOPLE = [
  person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR),
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
  person('p-juma', 'u-juma', 'Juma', 'Kamau'),
];

function setup(over: Partial<Setup> = {}): Setup {
  return {
    scenario: GroundScenario.OKR_ALIGNMENT,
    people: PEOPLE,
    checkIns: [answered('p-rukia', 1), answered('p-baraka', 1), answered('p-juma', 1)],
    objectives: [target('o-team', 'shops onboarded', 20, null, 'p-amina'), target('o-baraka', 'visits a week', 5, 'p-baraka', 'p-amina'), target('o-rukia', 'I am aiming for 3 shops in Kilimani.', 3, 'p-rukia', 'p-rukia')],
    commitments: [commitment('k1', 'p-rukia', 'I will send the deck to the client.'), commitment('k2', 'p-baraka', 'I will call the supplier.')],
    contextItems: [{ kind: 'UNSETTLED', audience: 'LEAD', text: 'Whether Baraka is the right person for the supplier work.' }],
    whoSeesTargets: 'THEIR_OWN',
    ...over,
  };
}

describe('an admin who takes part in a check-in reads it as a participant (decision 121, item 7)', () => {
  it('Juma, an admin who takes part, is served exactly what he is served as an ordinary member of the same check-in', async () => {
    const asAdmin = await boardAs(setup(), ...JUMA);
    const asMember = await boardAs(setup(), 'u-juma', 'MEMBER');
    expect(JSON.stringify(asAdmin)).toBe(JSON.stringify(asMember));
  });

  it('he reads no aim of Baraka or Rukia, no lead-only note, and cannot change the frame', async () => {
    const b: any = await boardAs(setup(), ...JUMA);
    const text = JSON.stringify(b);
    expect(text).not.toContain('visits a week');
    expect(text).not.toContain('Kilimani');
    expect(text).not.toContain('right person for the supplier work');
    expect(b.canEditFrame).toBe(false);
    expect(b.readOnlyNote).toBeNull();
  });

  it('Amina, who runs it, still reads every aim and can change the frame', async () => {
    const b: any = await boardAs(setup(), ...AMINA);
    expect(JSON.stringify(b)).toContain('visits a week');
    expect(b.canEditFrame).toBe(true);
  });

  it('an admin who is not in it is unchanged: she reads the aims and the note that she read before, and is told she only reads it', async () => {
    const outside = setup({ people: PEOPLE.filter((p) => p.id !== 'p-juma'), checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)] });
    const b: any = await boardAs(outside, ...JUMA);
    expect(JSON.stringify(b)).toContain('visits a week');
    expect(b.readOnlyNote).toMatch(/Amina Wanjiru runs it/);
    const asMember: any = await boardAs(outside, 'u-juma', 'MEMBER').catch((e) => ({ refused: String(e.message ?? e) }));
    expect(asMember.refused).toBeDefined();
  });

  it('the admin who set it up and also takes part keeps reading it as the one who set it up', async () => {
    const b: any = await boardAs(setup({ createdByUserId: 'u-juma' }), ...JUMA);
    expect(JSON.stringify(b)).toContain('visits a week');
  });
});
