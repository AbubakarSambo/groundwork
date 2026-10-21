import { whatTheOwnerSaidOfEachDeal } from './what-the-owner-said-of-each-deal';
import { theDealWasDropped } from './a-deal-that-was-dropped';

/**
 * GRACE'S MORNING SUMMARIES, TUESDAY 13 AND WEDNESDAY 14 OCTOBER (Drop Access, messages test, fourth run). From the run's own turns.
 *  - "Mama Pima Stores ... have no number of units yet.": Joseph said on Monday "Wanjiru wants 12,000 shillings off for 10 units."
 *  - "... Kamau Electricals and Westlands Pharmacy have no number of units yet.": Kevin said on Tuesday Kamau Electricals "just shut me
 *    down right away saying they already had a supplier", and Amos that Lucy at Westlands Pharmacy "just asked for a price for two units."
 */
const at = (s: string) => new Date(s);
const t = (role: 'AI' | 'PERSON', content: string, createdAt: string) => ({ role, content, createdAt: at(createdAt) });
const OURS = ['Grace', 'Kevin', 'Mercy', 'Joseph', 'Amos'];

describe('what each owner said of their deal', () => {
  it('Mama Pima Stores holds the 10 units Joseph said the discount was for', () => {
    const said = whatTheOwnerSaidOfEachDeal([{ id: 'pima', name: 'Mama Pima Stores', stage: null, fields: { 'Next step': 'Follow up' } }], [
      t('AI', 'What is your plan for the Mama Pima deal, specifically?', '2026-10-12T11:07:20.000Z'),
      t('PERSON', 'Wanjiru wants 12,000 shillings off for 10 units. I need to get her to agree to the current price.', '2026-10-12T11:07:21.000Z'),
    ], OURS);
    expect(said.get('pima')?.set.Units).toBe('10');
  });
  it('Westlands Pharmacy holds the two units Lucy asked a price for', () => {
    const said = whatTheOwnerSaidOfEachDeal([{ id: 'westlands', name: 'Westlands Pharmacy', stage: 'Contacted', fields: { Contact: 'Lucy' } }], [
      t('AI', 'Lucy, the manager at Westlands Pharmacy. What is their need, in their own words, that a water dispenser would solve for them?', '2026-10-13T11:05:00.000Z'),
      t('PERSON', "I didn't get it in her own words. She just asked for a price for two units.", '2026-10-13T11:05:01.000Z'),
    ], OURS);
    expect(said.get('westlands')?.set.Units).toBe('2');
  });
  it("Kamau Electricals is dropped from Kevin's Tuesday answer, which does not name it", () => {
    const kamau = { id: 'kamau', name: 'Kamau Electricals', stage: 'Contacted', fields: {} };
    const said = whatTheOwnerSaidOfEachDeal([kamau], [
      t('AI', "Kamau Electricals is a deal you were hoping to win. What specifically did you offer them that was close to Aqua Pure's price?", '2026-10-13T11:01:40.000Z'),
      t('PERSON', "I didn't actually get to offer them a specific price. They just shut me down right away saying they already had a supplier.", '2026-10-13T11:01:41.000Z'),
    ], OURS);
    expect(said.get('kamau')?.dropped).toEqual({ on: '2026-10-13', line: 'They just shut me down right away saying they already had a supplier.' });
    const lines = [{ text: "Kamau Electricals isn't contributing to the 120 units right now.", participantId: 'kevin', createdAt: at('2026-10-13T11:05:09.000Z') }];
    expect(theDealWasDropped({ ...kamau, ownerParticipantId: 'kevin' }, lines, { lastStage: 'Won', saidInTheCheckIn: said.get('kamau')!.dropped })?.on).toBe('2026-10-13');
    /* A later yes opens it again. */
    const yes = [...lines, { text: 'Kamau Electricals ordered 5 units today.', participantId: 'kevin', createdAt: at('2026-10-20T11:00:00.000Z') }];
    expect(theDealWasDropped({ ...kamau, ownerParticipantId: 'kevin' }, yes, { lastStage: 'Won', saidInTheCheckIn: said.get('kamau')!.dropped })).toBeNull();
  });
});

