import { theReportsWordsHeldToTheRecord, theRestOfTheWeekIn } from './the-leads-weekly-letter';

/*
 * The weekly letter (Fri 6 Nov, quality run 1) said "Collins Odhiambo committed to do ten kits, and it is now done." with no code ever
 * given. What moved and what to do are the report's sentences; the letter and Today read them through the final check.
 */
const prisma = {
  groundParticipant: { findMany: async () => [
    { id: 'p-c', partyType: 'PARTICIPANT', nameGiven: 'Collins Odhiambo', createdAt: new Date('2026-10-01'), user: { firstName: 'Collins', lastName: 'Odhiambo' } },
    { id: 'p-e', partyType: 'INITIATOR', nameGiven: 'Esther Wanjiru', createdAt: new Date('2026-09-30'), user: { firstName: 'Esther', lastName: 'Wanjiru' } },
  ] },
  groundDependency: { findMany: async () => [] },
  recordEntry: { findMany: async () => [{ participantId: 'p-c', text: 'This week I will do ten kits. I sold six kits so far.' }] },
  ground: { findUnique: async () => ({ brief: '', label: 'Kits', participants: [], objectives: [] }) },
};

describe('the weekly letter and Today hold the report\'s words to the record', () => {
  it('Esther reads what Collins really reported, and not that his promise is done', async () => {
    const r = await theReportsWordsHeldToTheRecord(prisma, 'g-1', {
      moved: ['Collins Odhiambo committed to do ten kits, and it is now done.', 'Collins Odhiambo reports selling six kits.'],
      toDo: [{ do: 'Ask Collins Odhiambo for the M-Pesa codes.', why: 'All eleven kits were confirmed by M-Pesa messages.' }],
    });
    expect(r!.moved).toEqual(['Collins Odhiambo reports selling six kits.']);
    expect(r!.toDo).toEqual([{ do: 'Ask Collins Odhiambo for the M-Pesa codes.', why: '' }]);
    expect(theRestOfTheWeekIn({ groundId: 'g-1', label: 'Kits', ofHowMany: 2, checkedIn: 1, notYet: [], saidWhatNext: 0, done: 0, waiting: 0, moved: r!.moved, toDo: r!.toDo }, 3)).toEqual([
      'Here is what moved this week. Collins Odhiambo reports selling six kits.',
      'Here is what I would do this week.',
      'Ask Collins Odhiambo for the M-Pesa codes.',
    ]);
  });
});
