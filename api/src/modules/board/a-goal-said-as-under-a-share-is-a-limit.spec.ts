import { PartyType } from '@prisma/client';
import { boardAs, person } from './the-switchboards-sections-harness';
import { whatTheWordsSuggest, whichWayItIsSaid } from './an-aim-or-a-limit';

/**
 * "Credit must stay under 35% of sales" was suggested as "a share to keep at 35% or more", because a
 * share was tested before a limit (the user journeys, 4 October 2026). A limit word is read first.
 */
const aim = (name: string, target: number) => ({
  id: 'o-1', groundId: 'g-1', name, target, count: 20, prevCount: 20, ownerParticipantId: null, setByParticipantId: 'p-helen', sortOrder: 0, addedAtSession: null,
});
const people = [person('p-helen', 'u-helen', 'Helen', 'Oyelaran', PartyType.INITIATOR), person('p-chidi', 'u-chidi', 'Chidi', 'Eze')];
const READERS = [['Helen, the lead', 'u-helen', 'MEMBER'], ['Chidi, taking part', 'u-chidi', 'MEMBER'], ['an admin outside the check-in', 'u-admin', 'ADMIN']] as const;

describe('a goal said with a limit word is a limit, even where it is a share', () => {
  it.each([
    'Credit must stay under 35% of sales',
    'Credit as a share of sales below 35%',
    'Credit should be no more than 35% of sales',
    'Credit at most 35% of sales',
    'Credit less than 35% of sales',
  ])('"%s" is suggested as a limit', (name) => {
    expect(whatTheWordsSuggest(name, 35)).toBe('LIMIT');
    expect(whichWayItIsSaid(name, 35, whatTheWordsSuggest(name, 35))).toBe(`"${name}" is a limit of 35% not to go over.`);
  });

  it('a share with no limit word is still a share, and "under the new scheme" is still an aim', () => {
    expect(whatTheWordsSuggest('Follow-up done on time as a percentage', 90)).toBe('RATE');
    expect(whatTheWordsSuggest('Credit is 35% of sales', 35)).toBe('RATE');
    expect(whatTheWordsSuggest('Pumps sold under the new scheme', 40)).toBe('AIM');
  });

  it.each(READERS)('%s reads a board that never says "35% or more" for it', async (_who, userId, role) => {
    const board: any = await boardAs({ people, initiatorId: 'u-helen', objectives: [aim('Credit must stay under 35% of sales', 35)], checkIns: [], snapshots: [] }, userId, role);
    expect(JSON.stringify(board)).not.toMatch(/35% or more/);
  });
});
