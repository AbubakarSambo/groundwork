import { whereWhatPeopleSaidDiffers } from './what-today-reads-from-the-record';
import { labelsForParties } from './party-labels';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 1, ON GRACE'S TODAY ("What needs you"). With the stored report's Greenfield
 * difference, Today read "People in this check-in said different things. The value of the signed deal with Greenfield Supermarket is
 * reported differently in the same week." Both sides were Mercy's, and she had corrected herself.
 */
const PEOPLE = [
  { id: 'p-grace', userId: 'u-grace', partyType: 'INITIATOR', user: { firstName: 'Grace', lastName: 'Achieng' } },
  { id: 'p-kevin', userId: 'u-kevin', partyType: 'PARTICIPANT', user: { firstName: 'Kevin', lastName: 'Omondi' } },
  { id: 'p-mercy', userId: 'u-mercy', partyType: 'PARTICIPANT', user: { firstName: 'Mercy', lastName: 'Wairimu' } },
];
const L = labelsForParties(PEOPLE as any);
const GREENFIELD = {
  topic: 'The value of the signed deal with Greenfield Supermarket is reported differently in the same week.',
  positions: [
    { view: `${L.get('p-mercy')} first reported the Greenfield deal as 25 units for KES 120,000.`, participantLabel: L.get('p-mercy') },
    { view: `In a later check-in the same week, ${L.get('p-mercy')} stated the same deal was for KES 125,000.`, participantLabel: L.get('p-mercy') },
  ],
  settledBy: 'Confirm the final amount for the Greenfield deal and update the record.',
};
const prisma = {
  report: { findUnique: jest.fn(async () => ({ divergences: [GREENFIELD] })) },
  checkIn: { findMany: jest.fn(async () => [{ participantId: 'p-kevin' }, { participantId: 'p-mercy' }]) },
  recordEntry: { findMany: jest.fn(async () => [{ participantId: 'p-mercy', text: "Okay, so for Greenfield, we got the order signed yesterday for 25 units. I mistakenly said it was KES 120,000, but it's actually KES 125,000." }]) },
  conversationTurn: { findMany: jest.fn(async () => []) },
};

describe('a correction is not a difference on Today', () => {
  it('on a sales check-in it is marked as not one, so Today with Release 1 on leaves it out', async () => {
    const out = await whereWhatPeopleSaidDiffers(prisma, 'g', PEOPLE, PEOPLE[0], { objectives: [], leadRowId: 'p-grace' });
    expect(out).toHaveLength(1);
    expect(out[0].onlyATargetSaidAgain).toBe(true);
  });
  it('without her correction on record it is a difference, as before', async () => {
    const p = { ...prisma, recordEntry: { findMany: jest.fn(async () => []) } };
    const out = await whereWhatPeopleSaidDiffers(p, 'g', PEOPLE, PEOPLE[0], { objectives: [], leadRowId: 'p-grace' });
    expect(out[0].onlyATargetSaidAgain).toBeUndefined();
  });
});
