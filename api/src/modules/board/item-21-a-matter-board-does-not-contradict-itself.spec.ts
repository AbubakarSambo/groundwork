import { GroundScenario } from '@prisma/client';
import { boardAs, answered, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE LAW FIRM MATTER BOARD: ITS OWN SECTIONS DO NOT CONTRADICT THE BOARD.
 *
 * "What we think we signed up to" (local test database, 595d8fa6; a contract review): Adaeze, who runs it,
 * read "Nothing is waiting for a decision yet." above a difference still open, and "Nothing has been said
 * about the matter yet." after both people had answered. This kind of check-in has no list of decisions and
 * does not list each person's lines, and both sections read their absence as "nothing".
 */
const TOPIC = 'They are using different standards to define what successful performance looks like.';
const report = { ...A_RELEASED_REPORT, divergences: [{ topic: TOPIC, atStake: null, evidence: [], positions: [] }] };
/* One round planned, as on the local check-in: such a board shows only the quick read, the differences and who checked in. */
const setup = { scenario: GroundScenario.CONTRACT_REVIEW, kindOfWork: 'a law firm matter', clock: { timelineDays: 7, cadence: 'WEEKLY' }, checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)], report };

/* Expectations updated (Hafsah, 30 October 2026: plain language for an impatient first-time lead; a difference is said as what people said, with no "needs settling".) */
describe('the matter board, as each reader reads it', () => {
  it('Amina, who runs it, reads the open difference as what she needs to decide', async () => {
    const b = await boardAs(setup as any, ...AMINA);
    expect(b.whatYouNeedToDecide).toEqual({
      heading: 'What you need to decide',
      state: 'filled',
      items: [{ question: `People said different things. ${TOPIC}`, why: 'What people said about this does not match.', owner: 'You' }],
    });
    expect(b.whereTheMatterStands.says).toContain('1 thing is waiting for a decision.');
  });
  it('and is not told nothing was said', async () => {
    const b = await boardAs(setup as any, ...AMINA);
    expect(b.whatChangedThisWeek).toEqual({ heading: 'What changed this week, and what it changed', state: 'not-known', why: 'This board does not list what each person said, so what changed this week is not shown here. It is in the report.' });
  });
  it('Juma, an admin, reads the same difference with Amina as its owner', async () => {
    const b = await boardAs(setup as any, ...JUMA);
    expect(b.whatYouNeedToDecide.items.map((x: any) => x.owner)).toEqual(['Amina Wanjiru']);
  });
  it('Rukia, who checks in, is served none of these, as before', async () => {
    const b = await boardAs(setup as any, ...RUKIA);
    expect(b.whatYouNeedToDecide).toBeUndefined();
    expect(b.whatChangedThisWeek).toBeUndefined();
  });
});
