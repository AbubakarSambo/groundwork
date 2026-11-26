import { whoStillOwesAnAnswer, theFollowUpSaidBack, whatBecameOfTheReminders } from './follow-up-with-whoever-has-not-answered';

/* "Please follow up with the people who haven't responded" (Fatima's Dangote office, 23 November 2026): said back by check-in, sent only on her yes. */
describe('following up with whoever has not answered', () => {
  const prisma = {
    ground: { findMany: jest.fn(async () => [
      { id: 'g-fin', label: '2026 report: Finance', status: 'AWAITING_PARTIES', participants: [
        { id: 'p-lead', userId: 'u-fatima', partyType: 'INITIATOR', user: { firstName: 'Fatima', lastName: 'Wali' } },
        { id: 'p-halima', userId: 'u-h', partyType: 'PARTICIPANT', user: { firstName: 'Halima', lastName: 'Yusuf' } },
        { id: 'p-emeka', userId: 'u-e', partyType: 'PARTICIPANT', user: { firstName: 'Emeka', lastName: 'Nwosu' } },
        { id: 'p-left', userId: 'u-l', partyType: 'PARTICIPANT', leftAt: new Date(), user: { firstName: 'Gone', lastName: 'Away' } },
      ] },
      { id: 'g-old', label: 'An ended one', status: 'RESOLVED', participants: [{ id: 'p-x', userId: 'u-x', partyType: 'PARTICIPANT', user: { firstName: 'X', lastName: 'Y' } }] },
    ]) },
    checkIn: { findMany: jest.fn(async () => [{ participantId: 'p-emeka', availableFrom: null }, { participantId: 'p-left', availableFrom: null }]) },
  };

  it('names only the people with an answer still open, on check-ins she runs that have not ended', async () => {
    const owing = await whoStillOwesAnAnswer(prisma, 'o1', 'u-fatima');
    expect(owing).toEqual([{ groundId: 'g-fin', participantId: 'p-emeka', name: 'Emeka Nwosu', label: '2026 report: Finance' }]);
  });

  it('says them back by check-in and asks once before anything is sent', async () => {
    const said = theFollowUpSaidBack(await whoStillOwesAnAnswer(prisma, 'o1', 'u-fatima'));
    expect(said).toContain('On 2026 report: Finance, Emeka Nwosu has not answered yet.');
    expect(said).toContain('Shall I send each of them a reminder from you now?');
    expect(theFollowUpSaidBack([])).toMatch(/nobody to remind/);
  });

  it('says what became of each reminder, in plain sentences', () => {
    const said = whatBecameOfTheReminders([{ name: 'Emeka Nwosu', says: 'Nudged at 10:40', nudged: true, channel: 'whatsapp' }, { name: 'Grace Ojo', says: 'Grace is on approved leave, so no nudge was sent.', nudged: false }]);
    expect(said).toContain('I sent a reminder to Emeka Nwosu by WhatsApp.');
    expect(said).toContain('Grace is on approved leave, so no nudge was sent.');
  });
});
