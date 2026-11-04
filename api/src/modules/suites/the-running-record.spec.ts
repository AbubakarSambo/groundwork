import { theRunningRecord, aSelfReviewDraft } from './the-running-record';

/* Release 7, hand-written: Daniel's commitments across two check-ins, one with a document behind it, and one goal he stopped when the
   direction changed on 15 September. */
const COMMITMENTS = [
  { id: 'c1', text: 'I will renew Lakeside’s contract', status: 'DONE', checkIn: 'Sales team, Q3', session: 4, settledOn: '2026-08-20', madeOn: '2026-08-11' },
  { id: 'c2', text: 'Set up a monthly call with each corporate account.', status: 'NOT_DONE', checkIn: 'Sales team, Q3', session: 6, settledOn: '2026-09-02', madeOn: '2026-08-25' },
  { id: 'c3', text: 'Send Kito Foods the revised quote', status: 'DONE', checkIn: 'Daniel, first 90 days', session: 2, settledOn: '2026-09-21', madeOn: '2026-09-19' },
  { id: 'c4', text: 'Visit Westgate Deli', status: 'OPEN', checkIn: 'Sales team, Q3', session: 9, settledOn: null, madeOn: '2026-09-22' },
];
const PROOF = [{ itemName: 'Lakeside contract', countsAsProof: true, on: '2026-08-20' }];
const CHANGES = [{ name: 'Visit 10 new corporate prospects', outcome: 'stopped' as const, newName: null, on: '2026-09-19', byThem: true }];

describe('Release 7: Daniel\'s running record, on his You board', () => {
  const r = theRunningRecord(COMMITMENTS, PROOF, CHANGES);

  it('says each thing he said he would do, newest first, where he said it, what became of it and what shows it', () => {
    expect(r.heading).toBe('Your record so far');
    expect(r.rows.map((x) => x.title)).toEqual(['Visit Westgate Deli', 'Send Kito Foods the revised quote', 'Set up a monthly call with each corporate account', 'Renew Lakeside’s contract']);
    expect(r.rows[3]).toMatchObject({ said: 'Said in Sales team, Q3, session 4, on 11 August.', became: 'Done on 20 August.', shows: 'A document backs it, added on 20 August.', tone: 'rec' });
    expect(r.rows[1]).toMatchObject({ became: 'Done on 21 September.', shows: 'Your word only, no document yet.', tone: 'att' });
    expect(r.rows[2]).toMatchObject({ became: 'Not done, marked on 2 September.', tone: 'con' });
    expect(r.rows[0]).toMatchObject({ became: 'Still open.', shows: 'Nothing to show yet.' });
  });

  it('says how he adapted when the direction changed, and the counts in one sentence', () => {
    expect(r.adapted).toEqual(['You stopped “Visit 10 new corporate prospects” on 19 September, when the direction changed.']);
    /* Changed 3 November 2026: one plain sentence (whatHappenedToThePromises), no clipped pieces. */
    expect(r.inShort).toBe('You said you would do 4 things. 2 are done, 1 was not done and 1 is still open.');
  });

  it('drafts his own view in the first person, for him to finish', () => {
    expect(aSelfReviewDraft(r).split('\n\n')).toEqual([
      'I said I would do 4 things. 2 are done, 1 was not done and 1 is still open.',
      'I did send Kito Foods the revised quote and renew Lakeside’s contract.',
      'I did not set up a monthly call with each corporate account. What got in the way was',
      'I stopped “Visit 10 new corporate prospects” on 19 September, when the direction changed.',
      'Next, I want to',
    ]);
  });

  it('says plainly when nothing is on record', () => {
    expect(theRunningRecord([], [], []).inShort).toBe('Nothing you said you would do is on record yet.');
  });
});
