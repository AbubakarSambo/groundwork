import { GroundScenario, PartyType } from '@prisma/client';
import { person, boardAs } from './the-switchboards-sections-harness';

/**
 * ITEM 18 (THE ONBOARDING BOARD): THE TITLE NAMES THE LEAD BY THEIR FIRST NAME, NEVER BY A TITLE.
 *
 * "Engagement Director, first 90 days" (a new hire, served from the local test database on 2 October
 * 2026). The lead's first-name field holds "Dr" and the last-name field "Amina Bello", as people here
 * often write it. A first 90 days is an evaluation check-in, so the person it is about reads whose
 * check-in it is rather than the lead's label, and Tobi read:
 *
 *   "Your check-in with Dr"
 *
 * Now he reads "Your check-in with Amina", the same first name the report and the conversation use
 * (a-title-is-not-a-first-name.ts). The lead still reads her own label.
 */
const PEOPLE = [
  person('p-amina', 'u-amina', 'Dr', 'Amina Bello', PartyType.INITIATOR),
  person('p-tobi', 'u-tobi', 'Tobi', 'Adewale'),
];
const SETUP = {
  scenario: GroundScenario.NEW_HIRE, people: PEOPLE, initiatorId: 'u-amina',
  label: 'Engagement Director, first 90 days', peersVisibleToEachOther: false,
  checkIns: [
    { id: 'c1-p-amina', participantId: 'p-amina', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-30T18:42:00Z'), specificityLevel: 'specific', specificityDimensions: {} },
    { id: 'c1-p-tobi', participantId: 'p-tobi', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-30T18:44:00Z'), specificityLevel: 'specific', specificityDimensions: {} },
  ],
};

describe('item 18: the onboarding board is titled with a first name, never a title', () => {
  it('Tobi, the new hire, reads "Your check-in with Amina"', async () => {
    const b = await boardAs(SETUP, 'u-tobi', 'MEMBER');
    expect(b.title).toBe('Your check-in with Amina');
  });

  it('Amina, who runs it, reads her own label', async () => {
    const b = await boardAs(SETUP, 'u-amina', 'ADMIN');
    expect(b.title).toBe('Engagement Director, first 90 days');
  });
});
