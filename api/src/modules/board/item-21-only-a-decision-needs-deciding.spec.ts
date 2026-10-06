import { boardAs, answered, handoff, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE ENGINEERING AND FOUNDER BOARDS: ONLY A DECISION NEEDS DECIDING.
 *
 * "Rebuilding the payments integration" (local test database, c6e70dcb): Ifeoma read, among what needs
 * deciding, "Samuel Otieno is waiting on the sandbox credentials, so it needs deciding." and "Samuel
 * Otieno cannot move until this is decided." On the founder's board Ada read the same of the
 * co-founder agreement. Credentials and an agreement are things somebody has to send; a decision is
 * still said as one.
 */
const setup = {
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  dependencies: [
    handoff('d-creds', 'p-rukia', 'the sandbox credentials', { onLabel: 'the new provider', status: 'BLOCKING' }),
    handoff('d-agreement', 'p-baraka', 'the co-founder agreement', { onParticipantId: 'p-amina', status: 'BLOCKING' }),
    handoff('d-scope', 'p-baraka', 'a decision on the release scope', { status: 'BLOCKING' }),
  ],
};
const decisions = async (reader: readonly [string, string]) => ((await boardAs(setup as any, ...reader)).decisions ?? []).filter((d: any) => d.source === 'blocker');

describe('what needs deciding, as each reader reads it', () => {
  it('Amina, who runs it, reads a wait for a thing as a wait, and a decision as a decision', async () => {
    const d = await decisions(AMINA);
    expect(d.map((x: any) => [x.question, x.why, x.owner])).toEqual([
      ['Rukia Mwangi is waiting on the new provider for the sandbox credentials.', 'Rukia Mwangi cannot move until it comes.', 'the new provider'],
      ['Baraka Otieno is waiting on you for the co-founder agreement.', 'Baraka Otieno cannot move until it comes.', 'You'],
      ['Baraka Otieno is waiting on a decision on the release scope, so it needs deciding.', 'Baraka Otieno cannot move until this is decided.', 'Nobody has been named to decide this.'],
    ]);
  });
  it('Juma, an admin, reads the same with Amina named', async () => {
    const d = await decisions(JUMA);
    expect(d[1].question).toBe('Baraka Otieno is waiting on Amina Wanjiru for the co-founder agreement.');
    expect(d.map((x: any) => x.question).join(' ')).not.toMatch(/credentials, so it needs deciding|agreement, so it needs deciding/);
  });
  it('Rukia, who checks in, is not served the list of decisions, as before', async () => {
    expect((await boardAs(setup as any, ...RUKIA)).decisions ?? []).toEqual([]);
  });
});
