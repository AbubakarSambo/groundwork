import { boardAs, answered, AMINA, BARAKA, RUKIA, JUMA, SETUP_ADMIN, handoff, THE_BOARDS_CLOCK } from './the-switchboards-sections-harness';

/**
 * REQUEST 115 (d): SOMEBODY WAITING ON A COLLEAGUE IS NOT "NOTHING TO DO".
 *
 * Neema, Amani and Baraka were each waiting on Rukia on "Sales team, Q3". Their answers were checkable
 * and each wait was recent and already chased, so the lead's board sent `reason: "nothing to do"`, which
 * the screen draws beside the name, while the same row said they still had something in the way. Now
 * the reason is "waiting on someone", and the row says on whom and for what, in a full sentence.
 */
/* Two days before the clock the board is read at, so the date reads the same on any day the tests run. */
const twoDaysAgo = new Date(THE_BOARDS_CLOCK.getTime() - 2 * 86_400_000);
const setup = {
  createdByUserId: 'u-setup',
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  dependencies: [
    handoff('d-baraka', 'p-baraka', 'the discount decision', { onParticipantId: 'p-rukia', status: 'WAITING', triedSaid: 'I asked her again yesterday.', createdAt: twoDaysAgo }),
  ],
};

describe('request 115 (d): a wait on a colleague is said as one', () => {
  it.each([
    ['Amina, the lead', AMINA],
    ['the admin who set it up', SETUP_ADMIN],
    ['Juma, an admin who only reads', JUMA],
  ])('%s reads that Baraka is waiting on Rukia, never "nothing to do"', async (_who, reader) => {
    const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
    const row = board.eachPerson.find((r: any) => r.participantId === 'p-baraka');
    expect(row.reason).toBe('waiting on someone');
    expect(row.says).toBe('Baraka Otieno has checked in, and has been waiting on Rukia Mwangi for the discount decision since 30 September.');
    /* Rukia waits on nobody, so nothing here needs the lead about her. */
    expect(board.eachPerson.find((r: any) => r.participantId === 'p-rukia').reason).toBe('nothing to do');
  });

  it('a wait on the reader is still "waiting on you", not "waiting on someone"', async () => {
    const onAmina = { ...setup, dependencies: [handoff('d-b', 'p-baraka', 'the price list', { onParticipantId: 'p-amina', status: 'WAITING', triedSaid: 'I asked twice.', createdAt: twoDaysAgo })] };
    const row = (await boardAs(onAmina as any, ...AMINA)).eachPerson.find((r: any) => r.participantId === 'p-baraka');
    expect(row.reason).toBe('nothing to do');
    expect(row.says).toBe('Baraka Otieno has checked in, and has been waiting on you for the price list since 30 September.');
  });

  it.each([['Rukia', RUKIA], ['Baraka', BARAKA]])('%s, who checks in, is sent no rows about people', async (_who, reader) => {
    const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
    expect(board.eachPerson).toBeUndefined();
  });
});
