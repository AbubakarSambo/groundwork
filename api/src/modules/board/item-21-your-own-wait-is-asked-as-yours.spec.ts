import { BISI, JUMA, FEMI, SALES_RUN, boardAs, handoff, type Setup } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE MARKETVIEW Q4 BOARD: THE READER'S OWN WAIT IS ASKED AS THEIRS.
 *
 * "The quarter workplan and what it costs" (local test database, 472bb15a): Omar, who runs it, read among
 * the questions for him "What has been tried to get the full, detailed breakdowns of their proposed spending
 * from Marketing and Product Development, which you are waiting for?" with "Nothing on record says anybody
 * has chased it, so only you can find out what was done outside the check-in." It was his own wait.
 */
const RECORD: Setup = {
  ...SALES_RUN,
  dependencies: [
    handoff('d-bisi', 'p-bisi', 'the detailed breakdowns of proposed spending', { onLabel: 'Marketing and Product Development', status: 'WAITING' }),
    handoff('d-bisi-2', 'p-bisi', 'the signed forms', { onParticipantId: 'p-kwame', status: 'WAITING' }),
  ],
};
const qs = async (reader: readonly [string, string]) => (await boardAs(RECORD, ...reader)).questionsForTheLead ?? [];

describe('the reader\'s own wait, among the questions for the lead', () => {
  it('Bisi reads it as hers', async () => {
    const q = await qs(BISI);
    expect(q.map((x: any) => [x.question, x.because])).toEqual(expect.arrayContaining([
      ['What have you tried to get the detailed breakdowns of proposed spending from Marketing and Product Development?', 'Nothing on record says you have chased it. If you did, outside the check-in, say so in your check-in.'],
      ['Have you gone back to Kwame Mensah about the signed forms?', 'Nothing on record says you have. If you raised it outside the check-in, say so in your check-in.'],
    ]));
    expect(JSON.stringify(q)).not.toMatch(/which you are waiting for/);
  });
  it('an admin reads it with Bisi named', async () => {
    const q = (await qs(JUMA)).map((x: any) => x.question);
    expect(q).toEqual(expect.arrayContaining(['What has been tried to get the detailed breakdowns of proposed spending from Marketing and Product Development, which Bisi Adeyemi is waiting for?']));
  });
  it('Femi, who checks in, is served no questions for the lead, as before', async () => {
    expect(await qs(FEMI)).toEqual([]);
  });
});
