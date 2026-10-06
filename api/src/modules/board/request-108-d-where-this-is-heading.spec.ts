import { GroundScenario } from '@prisma/client';
import {
  boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, SETUP_ADMIN, A_RELEASED_REPORT, type Setup,
} from './the-switchboards-sections-harness';
import { GROUNDWORK_DOES_NOT_CHOOSE, NOTHING_SAYS_WHAT_WOULD_SETTLE_IT, NO_SIGNALS_YET } from './where-this-is-heading';

/**
 * REQUEST 108 (d): "WHERE THIS IS HEADING" AND "RECORD THE DECISION".
 *
 * The prototype closes every board with the possible outcomes, the signals behind them, what would settle
 * it, who decides, "Groundwork lays out the outcomes and the proof. It doesn't choose." and "Record the
 * decision" (B5-the-board/board-as-lead.txt, G1-example-check-ins/*.txt). The product already records a
 * decision: the lead closes the check-in on one of its situation's endings, with a reason (the resolution
 * route, decision 6). So the outcomes are exactly those endings; the signals are sentences the reader is
 * already served; what would settle it is what the lead wrote down as still to decide. Nothing is invented.
 *
 * Read on the sales run (api/journey/all-24/re-f/sales.json), a "Set goals and keep the team on track"
 * check-in, as every reader.
 */
const RUN: Setup = {
  ...SALES_RUN,
  clock: { createdAt: new Date('2026-09-01T09:00:00Z'), timelineDays: 90, cadence: 'FORTNIGHTLY' },
  objectives: [{ id: 'o-approved', groundId: 'g-1', name: 'Approved facilities this quarter', target: 40, count: 11, prevCount: 11, ownerParticipantId: null, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null, assumes: [], direction: 'AIM' }],
  snapshots: [{ objectiveId: 'o-approved', sessionNumber: 1, count: 6 }, { objectiveId: 'o-approved', sessionNumber: 2, count: 11 }] as any,
  contextItems: [{ kind: 'DECISION', text: 'Whether to take the credit committee delays to the Head of Credit.' }],
};

describe('request 108 (d): where this is heading, as Bisi, who runs it, reads it', () => {
  it('lays out the endings she can record, the signals from the record, what would settle it, and that she decides', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(b.whereThisIsHeading).toEqual({
      heading: 'Where this is heading',
      about: 'Set goals and keep the team on track',
      outcomes: [
        { value: 'ALIGNED', says: 'The team is on course.', more: null },
        { value: 'REACH_WITH_A_CHANGE', says: 'The team can reach it, with a change in how the work is done.', more: null },
        { value: 'GAPS_IDENTIFIED', says: 'The target needs to change.', more: null },
        { value: 'NOT_YET', says: 'It is not settled yet, and more sessions are needed.', more: null },
      ],
      outcomesSays: null,
      signals: [
        {
          says: 'The team is aiming for 40 approved facilities this quarter. If it keeps moving at the pace it has since session 1, it would be about 31 by session 6, against an aim of 40.',
          from: 'It was 6 in session 1 and 11 in session 2, and this check-in runs for 6 sessions.',
        },
        { says: 'Femi Okonkwo is waiting for the bank statements.', from: 'This was raised once, on 16 September.' },
        { says: 'Ngozi Eze is waiting on Mr. Adebayo for a date for the credit decision.', from: 'This was raised once, on 16 September.' },
      ],
      signalsSays: null,
      whatWouldSettleIt: ['Whether to take the credit committee delays to the Head of Credit.'],
      whatWouldSettleItSays: 'You wrote this down as still to decide.',
      whoDecides: 'You decide.',
      groundworkDoesNotChoose: 'Groundwork lays out the outcomes and the proof. It doesn’t choose.',
      recordTheDecision: 'Record the decision',
      decided: null,
    });
  });

  it('says plainly where nothing on record points anywhere or says what would settle it', async () => {
    const b = await boardAs({ ...RUN, objectives: [], snapshots: [], dependencies: [], contextItems: [] }, ...BISI);
    expect(b.whereThisIsHeading.signals).toEqual([]);
    expect(b.whereThisIsHeading.signalsSays).toBe(NO_SIGNALS_YET);
    expect(b.whereThisIsHeading.signalsSays).toBe('Nothing on record points towards one outcome or another yet.');
    expect(b.whereThisIsHeading.whatWouldSettleIt).toEqual([]);
    expect(b.whereThisIsHeading.whatWouldSettleItSays).toBe(NOTHING_SAYS_WHAT_WOULD_SETTLE_IT);
    expect(b.whereThisIsHeading.whatWouldSettleItSays).toBe('Nothing on record says yet what would settle it.');
  });

  it('once she has recorded it, says which ending and when, and offers nothing more to record', async () => {
    const b = await boardAs({ ...RUN, status: 'CLOSED', endState: 'NOT_YET', resolvedAt: new Date('2026-09-30T10:00:00Z') }, ...BISI);
    expect(b.whereThisIsHeading.decided).toBe('You recorded the decision on 30 September. The outcome is that it is not settled yet, and more sessions are needed.');
    expect(b.whereThisIsHeading.recordTheDecision).toBeNull();
  });

  it('read the next year, the same board writes the year out', async () => {
    const b = await boardAs({ ...RUN, status: 'CLOSED', endState: 'NOT_YET', resolvedAt: new Date('2026-09-30T10:00:00Z'), clock: { ...RUN.clock, now: new Date('2027-01-15T12:00:00Z') } }, ...BISI);
    expect(b.whereThisIsHeading.decided).toBe('You recorded the decision on 30 September 2026. The outcome is that it is not settled yet, and more sessions are needed.');
  });
});

describe('request 108 (d): who else reads it', () => {
  it('the admin who set it up reads it with Bisi named as the one who decides, and cannot record it', async () => {
    const b = await boardAs({ ...RUN, createdByUserId: 'u-setup' }, ...SETUP_ADMIN);
    expect(b.whereThisIsHeading.whoDecides).toBe('Bisi Adeyemi decides.');
    expect(b.whereThisIsHeading.whatWouldSettleItSays).toBe('Bisi Adeyemi wrote this down as still to decide.');
    expect(b.whereThisIsHeading.recordTheDecision).toBeNull();
    expect(b.whereThisIsHeading.groundworkDoesNotChoose).toBe(GROUNDWORK_DOES_NOT_CHOOSE);
  });

  /* Changed by decision 93, row 14. This pinned "Juma, an admin who only reads, is not sent it", the restriction Hafsah removed. */
  it('Juma, an admin who only reads, reads it as the admin who set it up does, with Bisi named as the one who decides', async () => {
    const b = await boardAs(RUN, ...JUMA);
    expect(b.whereThisIsHeading.whoDecides).toBe('Bisi Adeyemi decides.');
    expect(b.whereThisIsHeading.whatWouldSettleItSays).toBe('Bisi Adeyemi wrote this down as still to decide.');
    expect(b.whereThisIsHeading.recordTheDecision).toBeNull();
    expect(b.whereThisIsHeading.groundworkDoesNotChoose).toBe(GROUNDWORK_DOES_NOT_CHOOSE);
    const bisi = await boardAs(RUN, ...BISI);
    expect(b.whereThisIsHeading.signals).toEqual(bisi.whereThisIsHeading.signals);
  });

  it.each([
    ['Femi, before the team picture is shared', FEMI, RUN],
    ['Femi, once it is shared and everybody sees the numbers', FEMI, { ...RUN, report: A_RELEASED_REPORT, whoSeesTargets: 'EVERYBODY' }],
    ['Ngozi, where people see only themselves', NGOZI, { ...RUN, peersVisibleToEachOther: false, report: A_RELEASED_REPORT }],
  ] as const)('%s is not sent it: the decision is the lead\'s', async (_who, reader, setup) => {
    const b = await boardAs(setup as Setup, reader[0], reader[1]);
    expect(b.whereThisIsHeading).toBeUndefined();
    expect(JSON.stringify(b)).not.toMatch(/Record the decision|credit committee delays/);
  });

  it('on a performance plan nobody is sent it, where the outcomes would be about a person (decision 6)', async () => {
    const pip: Setup = { ...RUN, scenario: GroundScenario.PIP, createdByUserId: 'u-setup', report: A_RELEASED_REPORT };
    for (const reader of [BISI, SETUP_ADMIN, FEMI, KWAME]) {
      const b = await boardAs(pip, reader[0], reader[1]);
      expect(b.whereThisIsHeading).toBeUndefined();
      expect(JSON.stringify(b)).not.toMatch(/Separation agreed|Performance concern resolved/);
    }
    /* Juma, an admin given no access to the plan, is not let in to the board at all (decision 5), so reads nothing of it. */
    await expect(boardAs(pip, ...JUMA)).rejects.toThrow(/Check-in not found/);
  });
});
