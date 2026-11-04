import { theCorrectionAsked, theVerdictMadeSafe, type WhatTheRecordHolds } from './a-correction-is-checked-like-a-claim';
import { keepTheCorrectionOnItsItem, correctionsMade } from '../conversation/a-correction-is-kept-on-its-item';
import { theFactsIn } from '../conversation/the-facts-on-record';

/**
 * "THAT'S NOT RIGHT" ON A LINE (F4 item 3). Mercy presses it on "Kilele Hotel paid KES 40,000 on Monday." The check is handed only the
 * lines she may read; a fix that holds up is kept on that line's assessment item, and every page that reads the item says the new thing.
 */
const anAssessment = () => ({
  kind: 'assessment', version: 1,
  about: { checkInId: 'c1', groundId: 'g1', participantId: 'p-mercy', who: 'Mercy Achieng', isTheLead: false, checkIn: 'Sales', sessionNumber: 2, startedAt: null, endedAt: '2026-11-02T09:00:00.000Z', channel: 'web', howItEnded: 'finished by the person' },
  workUpdates: [{ id: 'w1', words: 'Kilele Hotel paid KES 40,000 on Monday.', from: [1], whoMaySee: 'the people in this check-in', saidWordForWord: true }],
  observations: [{ id: 'o1', words: 'Mercy keeps letting promised days pass.', from: [1], whoMaySee: 'the lead only', saidWordForWord: false }],
  messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }],
});
const record = (facts: WhatTheRecordHolds['facts']): WhatTheRecordHolds => ({ promises: [], lines: [], numbers: [], documents: [], waits: [], facts, firstName: 'Mercy' });
const aDb = () => {
  let column: any = anAssessment();
  return {
    get column() { return column; },
    checkIn: {
      findUnique: async () => ({ sessionReport: column }),
      update: async ({ data }: any) => { column = data.sessionReport; return {}; },
    },
  };
};

describe('That\'s not right, on a line', () => {
  it('the check is handed the lines the asker may read, by id, with who said each', () => {
    const asked = theCorrectionAsked('That’s not right. “Kilele Hotel paid KES 40,000 on Monday.”', record([{ id: 'c1#w1', says: 'Kilele Hotel paid KES 40,000 on Monday.', who: 'You', on: 'Monday 2 November' }]));
    expect(asked).toContain('Lines Groundwork showed them:\n- c1#w1: You said "Kilele Hotel paid KES 40,000 on Monday." on Monday 2 November');
  });

  it('only a line it was handed can be corrected: a participant cannot reach a line about somebody else', () => {
    const r = record([{ id: 'c1#w1', says: 'Kilele Hotel paid KES 40,000 on Monday.', who: 'You', on: 'Monday' }]);
    expect(theVerdictMadeSafe({ verdict: 'backed', reply: 'Thanks.', lineId: 'c9#kevins-line', lineNowSays: 'x' }, r)!.line).toBeNull();
    expect(theVerdictMadeSafe({ verdict: 'backed', reply: 'You are right, I have changed it.', lineId: 'c1#w1', lineNowSays: 'Kilele Hotel paid KES 30,000 on Monday.' }, r)!.line)
      .toEqual({ id: 'c1#w1', nowSays: 'Kilele Hotel paid KES 30,000 on Monday.' });
    expect(theVerdictMadeSafe({ verdict: 'unclear', reply: 'Which line do you mean?', lineId: 'c1#w1', lineNowSays: 'x' }, r)!.line).toBeNull();
  });

  it('a fix that holds up is what Mercy and Grace both read from then on; an unproven one changes nothing anybody reads', async () => {
    const db = aDb();
    await keepTheCorrectionOnItsItem(db, { checkInId: 'c1', itemId: 'w1', nowSays: 'Kilele Hotel paid KES 30,000 on Monday.', backed: false, by: 'u-mercy' });
    expect(theFactsIn(db.column, { kind: 'the person', participantId: 'p-mercy' }).map((f) => f.words)).toEqual(['Kilele Hotel paid KES 40,000 on Monday.']);
    await keepTheCorrectionOnItsItem(db, { checkInId: 'c1', itemId: 'w1', nowSays: 'Kilele Hotel paid KES 30,000 on Monday.', backed: true, by: 'u-mercy' });
    expect(theFactsIn(db.column, { kind: 'the person', participantId: 'p-mercy' }).map((f) => f.words)).toEqual(['Kilele Hotel paid KES 30,000 on Monday.']);
    expect(theFactsIn(db.column, { kind: 'the lead', judgements: false }).map((f) => f.words)).toEqual(['Kilele Hotel paid KES 30,000 on Monday.']);
    /* The lead's judgement of her never reaches Mercy, corrected or not. */
    expect(theFactsIn(db.column, { kind: 'the person', participantId: 'p-mercy' }).map((f) => f.words).join(' ')).not.toMatch(/letting promised days pass/);
    expect(correctionsMade([db.column]).map((c) => [c.where, c.by, c.before, c.after, c.heldUp])).toEqual([
      ['ask', 'u-mercy', 'Kilele Hotel paid KES 40,000 on Monday.', 'Kilele Hotel paid KES 30,000 on Monday.', false],
      ['ask', 'u-mercy', 'Kilele Hotel paid KES 40,000 on Monday.', 'Kilele Hotel paid KES 30,000 on Monday.', true],
    ]);
  });
});
