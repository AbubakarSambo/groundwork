import { withoutWhatTheLeadHasNotToldThemAbout, theWordsOfWhatTheLeadHasNotToldThemAbout } from './an-untold-goal-is-not-a-board-objective';
import { withoutGoalsNotToldIn } from '../grounds/a-goal-not-told-stays-with-the-lead';

/**
 * REQUEST 125, SECOND PRIVACY REVIEW, FINDINGS 2, 3 AND 4. What Tobi, Chidi and an admin who only reads are served of the objectives
 * Amina set for Tobi, when she has a goal she has not told him about.
 *   2. A goal with a number and no word of work ("Sell 200 bags a week.") is matched on the number: the engine's "Tobi needs to sell
 *      200 bags every week." is not served.
 *   3. A goal with no number and no word of work ("Do more.", "Tobi to take over from Amina.") hides nothing beyond its own words
 *      (decision 86).
 *   4. One shared word is not enough to hide a goal ("Own the client renewals." must not hide "Lead the client conversations fully."),
 *      and nothing he was told about is ever hidden.
 */
const people = [{ id: 'p-amina', user: { firstName: 'Amina', lastName: 'Bello' } }, { id: 'p-tobi', user: { firstName: 'Tobi', lastName: 'Adewale' } }];
const untold = (text: string) => [{ participantId: 'p-tobi', text, awareness: 'NOT_TOLD', authoredBy: 'lead' }];
const told = { participantId: 'p-tobi', text: 'Lead the client conversations fully.', awareness: 'TOLD', authoredBy: 'lead' };
const mine = (id: string, name: string, target: number | null) => ({ id, name, target, ownerParticipantId: 'p-tobi', setByParticipantId: 'p-amina' });
const TOLD = mine('a', 'Lead the client conversations fully.', 3);
const BAGS = mine('b', 'Tobi needs to sell 200 bags every week.', 200);
const COUNT = mine('c', 'Tobi to do the weekly stock count.', null);

const kept = (objs: any[], rows: any[]) => withoutWhatTheLeadHasNotToldThemAbout(objs, rows, people, false).kept.map((o: any) => o.name);
const served = (objs: any[], rows: any[], sentence: string) => withoutGoalsNotToldIn({ a: sentence }, theWordsOfWhatTheLeadHasNotToldThemAbout(objs, rows, people, false)).a;

describe('an untold goal with a number and no word of work', () => {
  it('is matched on the number: the objective the engine wrote from it is not served', () => {
    expect(kept([BAGS], untold('Sell 200 bags a week.'))).toEqual([]);
    expect(served([BAGS], untold('Sell 200 bags a week.'), 'Tobi needs to sell 200 bags every week.')).toBe('');
  });

  it('keeps the objectives that do not carry the number', () => {
    expect(kept([TOLD, BAGS, COUNT], untold('Sell 200 bags a week.'))).toEqual(['Lead the client conversations fully.', 'Tobi to do the weekly stock count.']);
  });
});

describe('an untold goal with no number and no word of work', () => {
  it.each(['Do more.', 'Tobi to take over from Amina.'])('"%s" hides none of the objectives Amina set for Tobi', (text) => {
    expect(kept([TOLD, BAGS, COUNT], untold(text))).toEqual(['Lead the client conversations fully.', 'Tobi needs to sell 200 bags every week.', 'Tobi to do the weekly stock count.']);
    expect(served([TOLD, BAGS, COUNT], untold(text), 'Tobi led the client conversations on Monday.')).toBe('Tobi led the client conversations on Monday.');
  });
});

describe('one shared word is not the same goal', () => {
  it('"Own the client renewals." does not hide "Lead the client conversations fully."', () => {
    expect(kept([TOLD], untold('Own the client renewals.'))).toEqual(['Lead the client conversations fully.']);
  });

  it('nothing is hidden that matches a goal he was told, even when two words are shared', () => {
    const renewals = mine('r', 'Tobi to review the client renewals pipeline.', null);
    expect(kept([renewals], untold('Own the client renewals pipeline.'))).toEqual([]);
    expect(kept([renewals], [...untold('Own the client renewals pipeline.'), { ...told, text: 'Review the client renewals pipeline.' }])).toEqual(['Tobi to review the client renewals pipeline.']);
  });

  it('still hides the objective that says the untold goal in the engine words', () => {
    expect(kept([mine('r', 'Tobi to take over the client renewals.', null)], untold('Own the client renewals.'))).toEqual([]);
  });
});
