import { theReviewAsPictured } from './the-review-as-pictured';
import type { ARecordLine } from './the-record-read-for-a-review';

/* Hand-written, as the Check-in Reports file's "A review built from check-ins": Daniel Okafor, July to September, decided by Wairimu. */
const SALES = { groundId: 'g-sales', label: 'Sales team, Q3' };
const LINES: ARecordLine[] = [
  { key: 'goal:renewals', kind: 'goal', name: 'Corporate renewals', count: 5, target: 8, at: '2026-09-30', dueOn: '2026-09-30', ...SALES },
  { key: 'c1', kind: 'commitment', words: 'Renew Lakeside’s contract', wordForWord: false, madeOn: '2026-07-14', status: 'DONE', saidAgain: 0, settledOn: '2026-08-20', ...SALES },
  { key: 'c2', kind: 'commitment', words: 'Set up a monthly call with each corporate account', wordForWord: false, madeOn: '2026-07-21', status: 'NOT_DONE', saidAgain: 2, settledOn: '2026-09-25', ...SALES },
  { key: 'c3', kind: 'commitment', words: 'Visit 10 new corporate prospects', wordForWord: false, madeOn: '2026-08-04', status: 'DROPPED', saidAgain: 0, settledOn: null, ...SALES },
  { key: 'b1', kind: 'blocker', what: 'a contact at four of the accounts', onUserId: null, onFirst: null, onLabel: 'the accounts', saidOn: '2026-08-10', clearedOn: null, ...SALES },
];
const BASE = {
  lines: LINES, personFirst: 'Daniel', deciderFirst: 'Wairimu', theirView: 'I didn’t know the target had changed to 8 until August. When the direction changed, I moved quickly',
  goalVersions: [{ name: 'Corporate renewals', target: 5, outcome: 'modified', newName: 'Corporate renewals', newTarget: 8, decidedAt: '2026-09-18T10:00:00.000Z', decidedBy: 'person' },
    { name: 'Visit 10 new corporate prospects', target: 10, outcome: 'stopped', newName: null, newTarget: null, decidedAt: '2026-09-19T10:00:00.000Z', decidedBy: 'person' }],
  directionChanges: [{ setAt: '2026-09-15T08:00:00.000Z', stops: [{ what: 'Visits to new corporate prospects', whoParticipantId: 'p-daniel' }] }],
  personParticipantIds: ['p-daniel'],
  liveGoals: [{ name: 'Corporate renewals', count: 5, target: 8 }, { name: 'New corporate prospects visited each week', count: 3, target: 5 }],
};

describe('Release 7: a review built from check-ins, as Wairimu reads Daniel\'s', () => {
  const r = theReviewAsPictured({ ...BASE, who: 'Daniel', isThePerson: false });

  it('reads outcome, adaptation and alignment side by side, from the record and the direction in force', () => {
    expect(r.readings).toEqual([
      { label: 'Outcome', question: 'Did the work produce what was intended?', says: '5 on “Corporate renewals”, against a first target of 5 and a later one of 8.',
        /* Each reading with its evidence, from the record (Hafsah, 25 October). */
        evidence: ['“Renew Lakeside’s contract”, done on 20 August.', '“Set up a monthly call with each corporate account”, not done.'] },
      { label: 'Adaptation', question: 'Did Daniel notice new information and adjust well?', says: 'When the direction changed on 15 September, Daniel changed or stopped 2 of their goals within 3 days.',
        evidence: ['“Corporate renewals” was stopped on 18 September, by Daniel.', '“Visit 10 new corporate prospects” was stopped on 19 September, by Daniel.'] },
      { label: 'Alignment', question: 'Does Daniel’s work now serve the current direction?', says: 'Partly. “New corporate prospects visited each week” is still on the board, though the team\'s brief stops it.',
        evidence: ['The team’s brief stops “Visits to new corporate prospects”.'] },
    ]);
  });

  it('says what he committed to and what became of each', () => {
    expect(r.committedHeading).toBe('What Daniel committed to, and what Daniel did');
    expect(r.committed.map((c) => `${c.title}. ${c.says}`)).toEqual([
      'Renew Lakeside’s contract. Done on 20 August.',
      'Set up a monthly call with each corporate account. Not done, marked on 25 September.',
      'Visit 10 new corporate prospects. Dropped later.',
    ]);
  });

  it('asks "blocked, or dropped it?" from the record: a wait on somebody else, the direction, or not known, never his character', () => {
    expect(r.blockedOrDropped.map((b) => `${b.title}. ${b.says}`)).toEqual([
      'Set up a monthly call with each corporate account. The situation, mostly. Daniel was waiting on the accounts for a contact at four of the accounts.',
      'Visit 10 new corporate prospects. The situation. The direction changed, and the goal it served was changed or stopped with it.',
    ]);
    expect(JSON.stringify(r)).not.toMatch(/\b(PIP|exit|at risk|underperform|lazy|character)\b/i);
  });

  it('gives his own view in his words, and says who decides and that he can appeal', () => {
    expect(r.ownView).toBe('“I didn’t know the target had changed to 8 until August. When the direction changed, I moved quickly.”');
    expect(r.decides).toBe('The review is a draft. Wairimu decides and gives the reasons. Daniel sees them, can add their side, and can appeal.');
  });
});

describe('Release 7: the same review, as Daniel reads his own', () => {
  it('is said to him as "you"', () => {
    const r = theReviewAsPictured({ ...BASE, who: 'you', isThePerson: true });
    expect(r.readings[1].says).toBe('When the direction changed on 15 September, you changed or stopped 2 of your goals within 3 days.');
    expect(r.committedHeading).toBe('What you committed to, and what you did');
    expect(r.decides).toBe('The review is a draft. Wairimu decides and gives the reasons. You see them, can add your side, and can appeal.');
  });
});

describe('Release 7: with no direction change and no goals', () => {
  it('says there was nothing to adjust to, and reads the outcome from commitments', () => {
    const r = theReviewAsPictured({ ...BASE, lines: LINES.filter((l) => l.kind === 'commitment'), goalVersions: [], directionChanges: [], liveGoals: [], who: 'Daniel', isThePerson: false });
    expect(r.readings.map((x) => x.says)).toEqual([
      'Daniel did 1 of the 3 things they said they would do.',
      'The direction did not change in this period, so there was nothing new to adjust to.',
      'There is no company direction on record to check the work against.',
    ]);
  });
});
