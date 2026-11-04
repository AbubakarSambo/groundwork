import { AMINA, RUKIA, JUMA, A_RELEASED_REPORT, boardAs } from './the-switchboards-sections-harness';
import { isAWholeSentence, peopleSaidDifferentThingsAbout } from '../reports/what-people-said-differently-about';
import { draftTheQuestion } from '../reports/the-picture-is-drafted-from-the-reads';

/**
 * ITEM 18 (THE PROJECT BOARD): A DIFFERENCE WHOSE TOPIC IS A WHOLE SENTENCE IS SAID AS ONE.
 *
 * "Atlas delivery" (served from the local test database on 2 October 2026). The report wrote two topics as whole
 * sentences, and Tunde read:
 *   "People in this check-in said different things about who has the final authority on the completion of the Atlas
 *    analysis is not agreed, so it needs settling."
 *   "If this holds, the analysis may be delivered incomplete ... That is what settles the delivery deadline for the
 *    analysis is not agreed upon."
 * Now: "People in this check-in said different things. Who has the final authority on the completion of the Atlas
 * analysis is not agreed. This needs settling." and "The delivery deadline for the analysis is not agreed upon. If
 * this holds, ...".
 */
const AUTHORITY = 'Who has the final authority on the completion of the Atlas analysis is not agreed.';
const DEADLINE = 'The delivery deadline for the analysis is not agreed upon.';
const AT_STAKE = 'If this holds, the analysis may be delivered incomplete on the earlier deadline';

/* Expectation updated (Hafsah, 30 October 2026: plain language for an impatient first-time lead; a difference is said as what people said, with no "needs settling".) */
describe('item 18: a topic that is a whole sentence is said as one', () => {
  it('a noun clause that says something of itself is a whole sentence; one that does not is not', () => {
    expect(isAWholeSentence(AUTHORITY)).toBe(true);
    expect(isAWholeSentence('whether a price range counts as a budget')).toBe(false);
    expect(isAWholeSentence('who owns the price list')).toBe(false);
    expect(peopleSaidDifferentThingsAbout(AUTHORITY)).toBe('People said different things. Who has the final authority on the completion of the Atlas analysis is not agreed.');
  });

  it('the question the board drafts says the topic as its own sentence, never after "settles"', () => {
    const q = draftTheQuestion({ differences: [{ topic: DEADLINE, settledBy: AT_STAKE }], blockers: [] } as any);
    expect(q?.text).toBe('The delivery deadline for the analysis is not agreed upon. If this holds, the analysis may be delivered incomplete on the earlier deadline.');
    const plain = draftTheQuestion({ differences: [{ topic: 'the price list', settledBy: 'A written price list' }], blockers: [] } as any);
    expect(plain?.text).toBe('A written price list. That is what settles the price list.');
  });

  const report = { ...A_RELEASED_REPORT, divergences: [{ topic: AUTHORITY, positions: [{ participantLabel: 'Participant A', view: 'Ifeoma decides.' }, { participantLabel: 'Participant B', view: 'The client decides.' }] }] };
  it.each([['Amina, who runs it', AMINA], ['Rukia, who checks in', RUKIA], ['Juma, an admin who only reads', JUMA]])('%s never reads the topic after "about" or "settles"', async (_who, [user, role]) => {
    const b = await boardAs({ report }, user, role);
    const served = JSON.stringify(b);
    expect(served).not.toMatch(/about who has the final authority/i);
    expect(served).not.toMatch(/settles who has the final authority/i);
  });

  it('Amina reads the decision to settle in full sentences', async () => {
    const b = await boardAs({ report }, ...AMINA);
    const q = (b.decisions ?? []).map((d: any) => d.question).find((x: string) => /final authority/.test(x));
    expect(q).toMatch(/said different things\. Who has the final authority on the completion of the Atlas analysis is not agreed\.$/);
  });
});
