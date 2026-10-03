import { boardAs, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';
import { theVerbAgreesWithYouIn } from '../reports/party-labels';

/**
 * ITEM 21, THE FOUNDER'S BOARD: AN AIM SET AS AN INSTRUCTION IS SAID AS IT WAS SET.
 *
 * "A second founder joining" (local test database, 9a904212). Ada's aims were stored as instructions,
 * and every reader read them glued onto "The team is working on ...":
 *   "The team is working on provide the final details for the paperwork to my lawyer."
 *   "The team is working on let go of control and delegate the engineering function to Tunde."
 *   "The team is aiming for 25 draft the formal co-founder agreement for Tunde, ..."
 * And "I'll know the engineering side is running smoothly when I don't have to think about it anymore."
 * reached Ada as "... when you doesn't have to think about it anymore."
 */
const objective = (id: string, name: string, target: number | null, sortOrder: number) => ({
  id, groundId: 'g-1', name, target, count: 0, prevCount: 0, ownerParticipantId: null, setByParticipantId: 'p-amina',
  direction: null, isADecisionAboutAPerson: false, sortOrder, addedAtSession: null, assumes: [],
});
const OBJECTIVES = [
  objective('o-1', 'Provide the final details for the paperwork to my lawyer.', null, 1),
  objective('o-2', 'Let go of control and delegate the engineering function to Rukia.', null, 2),
  objective('o-3', 'Draft the formal agreement for Rukia, including the equity offer of 25% vesting over four years.', 25, 3),
  objective('o-4', 'Contracts signed', 12, 4),
];
const names = async (reader: readonly [string, string]) => ((await boardAs({ objectives: OBJECTIVES, whoSeesTargets: 'EVERYBODY' } as any, ...reader)).objectives ?? []).map((o: any) => o.name);

describe('aims set as instructions, as each reader reads them', () => {
  it('Amina, who set them, reads each as she set it, and "your lawyer"', async () => {
    expect(await names(AMINA)).toEqual([
      'Provide the final details for the paperwork to your lawyer.',
      'Let go of control and delegate the engineering function to Rukia.',
      'Draft the formal agreement for Rukia, including the equity offer of 25% vesting over four years.',
      'The team is aiming for 12 contracts signed.',
    ]);
  });
  it.each([['Rukia, who checks in', RUKIA], ['Juma, an admin', JUMA]])('%s reads them with Amina named, never "The team is working on provide"', async (_w, reader) => {
    const n = await names(reader as readonly [string, string]);
    expect(n[0]).toBe('Provide the final details for the paperwork to Amina Wanjiru\'s lawyer.');
    expect(n.join(' ')).not.toMatch(/working on (?:provide|let go)|aiming for 25 draft/);
  });
});

describe('"you" takes its verb when it is said short', () => {
  it('"when you doesn\'t have to think" is "when you don\'t"', () => {
    expect(theVerbAgreesWithYouIn('You will know it is running smoothly when you doesn\'t have to think about it anymore.'))
      .toBe('You will know it is running smoothly when you don\'t have to think about it anymore.');
  });
  it('and "for you isn\'t" is left alone, because "you" is not the one doing it', () => {
    expect(theVerbAgreesWithYouIn('A worry for you isn\'t new.')).toBe('A worry for you isn\'t new.');
  });
});
