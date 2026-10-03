import { boardAs, SALES_RUN, BISI, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 121, PART 1: "TO CLOSE THE GAP" SAYS THE DAY THE AIM ITSELF IS DUE, THE SAME DAY AS THE HEADLINE, read as each person who reads the board.
 */
describe('request 121 (1): the gap and the headline say the same day', () => {
  const aim = {
    id: 'o-team', groundId: 'g-1', name: 'Sign 12 shops for kitchen appliances in Nairobi.', target: 12, count: 0, prevCount: 0,
    ownerParticipantId: null, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null, assumes: [], direction: 'AIM',
    dueOn: new Date('2026-12-20T00:00:00Z'),
  };
  const RUN: Setup = {
    ...SALES_RUN, kindOfWork: 'sales org', createdByUserId: 'u-setup', objectives: [aim],
    clock: { now: new Date('2026-10-02T15:00:00Z'), endsAt: new Date('2026-12-13T17:00:00Z') },
  };

  it.each([['Bisi, who runs it', BISI], ['the admin who set it up', ['u-setup', 'ADMIN'] as const]])('%s reads 20 December in both places', async (_who, reader) => {
    const b = await boardAs(RUN, ...(reader as readonly [string, string]));
    expect(b.headline.question).toContain('by 20 December');
    expect(b.toCloseTheGap.says).toBe('12 more are needed by 20 December, and no deal on record is still open before then. Each open deal is counted as one toward the aim of 12.');
    expect(JSON.stringify(b.toCloseTheGap)).not.toMatch(/13 December/);
  });

  it('falls back to the check-in\'s end when the aim has no day of its own', async () => {
    const b = await boardAs({ ...RUN, objectives: [{ ...aim, dueOn: null }] }, ...BISI);
    expect(b.toCloseTheGap.says).toMatch(/^12 more are needed by 13 December/);
  });
});

