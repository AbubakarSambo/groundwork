import { GroundScenario } from '@prisma/client';
import {
  boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, SETUP_ADMIN, A_RELEASED_REPORT, type Setup,
} from './the-switchboards-sections-harness';
import { whereThisTargetStands, theHeadlineQuestion } from './the-headline-and-where-each-target-stands';

/**
 * REQUEST 108, PARTS (a) AND (b): THE HEADLINE QUESTION WITH ITS BAR, AND A WORD FOR WHERE EACH TARGET STANDS.
 *
 * The prototype's boards open on "Will we reach 25 sales by 30 September?" with a one-line answer and a bar,
 * and list "Where each target stands" with "Met", "Close", "Behind", "Within", "Over limit" or "Not settled"
 * (docs/prototype/screens/B5-the-board/board-as-lead.txt, G1-example-check-ins/*.txt).
 *
 * Read on the sales run (api/journey/all-24/re-f/sales.json): Bisi said "We're aiming for 40 approved
 * facilities and N120 million disbursed this quarter." The team was at 6 approved and 19 million after
 * session 1, and 11 and 31 million after session 2, on a 90-day fortnightly check-in (6 sessions). Femi's
 * own target is 12 and Kwame's 14. Read as every reader: Bisi who runs it, Femi, Ngozi and Kwame who check
 * in (with and without seeing each other's numbers, before and after the team picture is shared), Juma, an
 * admin who only reads, the admin who set it up, and Femi as the person reviewed on a performance plan.
 */
const target = (id: string, name: string, n: number, count: number, owner: string | null, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', name, target: n, count, prevCount: count, ownerParticipantId: owner, setByParticipantId: 'p-bisi', sortOrder: owner ? 1 : 0, addedAtSession: null, assumes: [], direction: 'AIM', ...more,
});
const RUN: Setup = {
  ...SALES_RUN,
  clock: { createdAt: new Date('2026-09-01T09:00:00Z'), timelineDays: 90, cadence: 'FORTNIGHTLY' },
  objectives: [
    target('o-approved', 'Approved facilities this quarter', 40, 11, null),
    target('o-disbursed', 'Naira disbursed this quarter', 120_000_000, 31_000_000, null, { sortOrder: 0 }),
    target('o-femi', 'Approved facilities for Femi this quarter', 12, 2, 'p-femi'),
    target('o-kwame', 'Approved facilities for Kwame this quarter', 14, 3, 'p-kwame'),
  ],
  snapshots: [
    { objectiveId: 'o-approved', sessionNumber: 1, count: 6 }, { objectiveId: 'o-approved', sessionNumber: 2, count: 11 },
    { objectiveId: 'o-disbursed', sessionNumber: 1, count: 19_000_000 }, { objectiveId: 'o-disbursed', sessionNumber: 2, count: 31_000_000 },
    { objectiveId: 'o-femi', sessionNumber: 1, count: 2 }, { objectiveId: 'o-femi', sessionNumber: 2, count: 2 },
  ] as any,
};
const released = (s: Setup): Setup => ({ ...s, report: A_RELEASED_REPORT });
const everybody = (s: Setup): Setup => ({ ...s, whoSeesTargets: 'EVERYBODY' });
const stand = (b: any, id: string) => (b.objectives ?? []).find((o: any) => o.id === id)?.stands;

const THE_QUESTION = 'Will we reach 40 approved facilities and 120 million naira disbursed this quarter?';
const THE_ANSWER = 'So far it is 11 of the 40 approved facilities. 29 more are needed. So far it is 31 million of the 120 million naira disbursed. 89 million more are needed.';
const APPROVED_STANDS = { word: 'Behind', says: 'At the pace it has kept since session 1, it would be about 31 by the last session, short of the aim of 40.' };

describe('(a) the headline question, as Bisi, who runs it, reads it', () => {
  it('asks the team aims in the lead\'s own words, with the time she said, and answers from the counts', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(b.headline.question).toBe(THE_QUESTION);
    expect(b.headline.answer).toBe(THE_ANSWER);
    expect(b.headline.bars).toEqual([
      { objectiveId: 'o-approved', kind: 'aim', now: 11, target: 40, filled: 15, word: 'Behind' },
      { objectiveId: 'o-disbursed', kind: 'aim', now: 31_000_000, target: 120_000_000, filled: 12, word: 'Behind' },
    ]);
  });

  it('adds the check-in\'s own deadline where the aim\'s words say no time', async () => {
    const b = await boardAs({ ...RUN, objectives: [target('o-approved', 'Approved facilities', 40, 11, null)] }, ...BISI);
    expect(b.headline.question).toBe('Will we reach 40 approved facilities by 30 November?');
    expect(b.headline.answer).toBe('So far it is 11 of the 40 approved facilities. 29 more are needed by 30 November.');
  });

  it('read the next year, the same board writes the deadline\'s year out', async () => {
    const b = await boardAs({ ...RUN, objectives: [target('o-approved', 'Approved facilities', 40, 11, null)], clock: { ...RUN.clock, now: new Date('2027-01-15T12:00:00Z') } }, ...BISI);
    expect(b.headline.question).toBe('Will we reach 40 approved facilities by 30 November 2026?');
    expect(b.headline.answer).toBe('So far it is 11 of the 40 approved facilities. 29 more are needed by 30 November 2026.');
  });

  it('asks nothing where no team aim has a number, and never makes one up from a person\'s own target', async () => {
    const b = await boardAs({ ...RUN, objectives: RUN.objectives!.filter((o: any) => o.ownerParticipantId) }, ...BISI);
    expect(b.headline).toBeUndefined();
  });

  it('asks an aim with no number only where it is something to do and the check-in has a deadline (run-21, the payments rebuild)', async () => {
    const project: Setup = { ...RUN, scenario: GroundScenario.NEW_PROJECT, objectives: [{ ...target('o-p', 'Replace the payments integration', 0, 0, null), target: null }], clock: { createdAt: new Date('2026-09-01T09:00:00Z'), timelineDays: 60, cadence: 'WEEKLY' } };
    const b = await boardAs(project, ...BISI);
    expect(b.headline).toEqual({ question: 'Will we replace the payments integration by 31 October?', answer: null, bars: [] });
    const open = await boardAs({ ...project, clock: { createdAt: new Date('2026-09-01T09:00:00Z'), runsUntilEnded: true, timelineDays: 0, cadence: 'WEEKLY' } }, ...BISI);
    /* Changed on 5 October (requests 127 and 129): a check-in with no deadline still asks its question, without a day;
       the prototype's support desk and depot boards open on one. Before, it asked nothing. */
    expect(open.headline).toEqual({ question: 'Will we replace the payments integration?', answer: null, bars: [] });
  });

  it('asks a limit as a limit (decision 69), from the workplan run\'s spending', async () => {
    const b = await boardAs({ ...RUN, objectives: [target('o-spend', 'Spending this quarter', 180_000, 254_000, null, { direction: 'LIMIT' })] }, ...BISI);
    expect(b.headline.question).toBe('Will we keep spending within 180,000 this quarter?');
    expect(b.headline.answer).toBe('So far it is 254,000, which is 74,000 over the limit of 180,000.');
    expect(b.headline.bars[0]).toMatchObject({ kind: 'limit', filled: 100, word: 'Over limit' });
  });
});

describe('(a) who reads the headline', () => {
  it('the admin who set it up reads it as Bisi does', async () => {
    const b = await boardAs({ ...RUN, createdByUserId: 'u-setup' }, ...SETUP_ADMIN);
    expect(b.headline.question).toBe(THE_QUESTION);
  });

  /* Decision 86 reverses decision 73 for admins: this used to pin that Juma got no question and no words. */
  it('Juma, an admin who only reads, is sent the aims, so the same question and words as Bisi', async () => {
    const b = await boardAs(RUN, ...JUMA);
    expect(b.headline.question).toBe(THE_QUESTION);
    expect(stand(b, 'o-approved')).toEqual(stand(await boardAs(RUN, ...BISI), 'o-approved'));
    expect(stand(b, 'o-approved').word).toBe('Behind');
  });

  it('Femi, where each person sees only their own numbers, is not sent it, even once the picture is shared', async () => {
    const b = await boardAs(released(RUN), ...FEMI);
    expect(b.headline).toBeUndefined();
    expect(stand(b, 'o-approved')).toBeUndefined();
  });

  it('Femi, where everybody sees the numbers, reads nothing of it before the team picture is shared', async () => {
    const b = await boardAs(everybody(RUN), ...FEMI);
    expect(b.headline).toBeUndefined();
    expect(stand(b, 'o-approved')).toBeNull();
    expect(b.teamPicture.shared).toBe(false);
  });

  it('Femi, where everybody sees the numbers, reads the question and the team\'s words once it is shared, and never Kwame\'s', async () => {
    const b = await boardAs(released(everybody(RUN)), ...FEMI);
    expect(b.headline.question).toBe(THE_QUESTION);
    expect(stand(b, 'o-approved')).toEqual(APPROVED_STANDS);
    expect(stand(b, 'o-femi')).toBeNull();
    expect(JSON.stringify(b.headline)).not.toMatch(/o-kwame|o-femi|Kwame|Femi/);
  });

  it('Ngozi, where people see only themselves, reads only the team\'s aims in it', async () => {
    const b = await boardAs(released(everybody({ ...RUN, peersVisibleToEachOther: false })), ...NGOZI);
    expect(b.headline.bars.map((x: any) => x.objectiveId)).toEqual(['o-approved', 'o-disbursed']);
    expect(JSON.stringify(b.headline)).not.toMatch(/Femi|Kwame/);
  });

  it('on a performance plan nobody is sent it: not the lead, not the person reviewed, not a colleague giving a view', async () => {
    const pip: Setup = released(everybody({ ...RUN, scenario: GroundScenario.PIP, createdByUserId: 'u-setup' }));
    for (const reader of [BISI, FEMI, KWAME]) {
      const b = await boardAs(pip, reader[0], reader[1]);
      expect(b.headline).toBeUndefined();
      for (const o of b.objectives ?? []) expect(o.stands ?? null).toBeNull();
    }
  });

  it('a goal the lead has not told Femi about is not in his question (decision 56)', async () => {
    const b = await boardAs(released(everybody({ ...RUN, personObjectives: [{ id: 'po-1', participantId: 'p-femi', text: 'Approved facilities this quarter', awareness: 'NOT_TOLD', createdAt: new Date('2026-09-01T09:00:00Z') }] })), ...FEMI);
    for (const bar of b.headline?.bars ?? []) expect((b.objectives ?? []).some((o: any) => o.id === bar.objectiveId)).toBe(true);
  });
});

describe('(b) where each target stands, as Bisi reads it', () => {
  it('reads each team target off its pace, and puts no word on a person\'s own target', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(stand(b, 'o-approved')).toEqual(APPROVED_STANDS);
    expect(stand(b, 'o-disbursed')).toEqual({ word: 'Behind', says: 'At the pace it has kept since session 1, it would be about 79 million by the last session, short of the aim of 120 million.' });
    expect(stand(b, 'o-femi')).toBeNull();
    expect(stand(b, 'o-kwame')).toBeNull();
  });

  it('says "Not settled" where the lead wrote down that the number is not settled', async () => {
    const b = await boardAs({ ...RUN, contextItems: [{ kind: 'UNSETTLED', text: 'Whether the 120m counts what was approved or what was disbursed.' }] }, ...BISI);
    expect(stand(b, 'o-disbursed')).toEqual({ word: 'Not settled', says: 'What this number counts is not settled yet, so how it stands cannot be said.' });
  });

  it('says why there is no word yet, after one session', async () => {
    const b = await boardAs({ ...RUN, snapshots: [{ objectiveId: 'o-approved', sessionNumber: 1, count: 6 }] as any }, ...BISI);
    expect(stand(b, 'o-approved')).toEqual({ word: null, says: 'It needs a count from two sessions before its pace can be read, so how it stands cannot be said yet.' });
  });
});

describe('(b) the thresholds', () => {
  const t = (count: number, more: Record<string, any> = {}) => ({ id: 'x', target: 40, count, start: 6, direction: 'AIM' as const, journeyDirection: 'up' as const, notSettled: null, ...more });
  const counts = (s1: number, s2: number) => [{ sessionNumber: 1, count: s1 }, { sessionNumber: 2, count: s2 }];
  it('On time where the pace reaches the aim by the last session', () => {
    expect(whereThisTargetStands(t(14), counts(6, 14), 6)?.word).toBe('On time');
  });
  it('Close where the pace covers at least 90% of the way, Behind where it covers less', () => {
    /* 6 in session 1 and 19 in session 3: 6.5 a session, so about 38 by session 6, which is 96% of the way from 6 to 40. */
    expect(whereThisTargetStands(t(19), [{ sessionNumber: 1, count: 6 }, { sessionNumber: 3, count: 19 }], 6)).toEqual({ word: 'Close', says: 'At the pace it has kept since session 1, it would be about 39 by the last session, close to the aim of 40.' });
    /* 6 then 12: about 36 by session 6, 88% of the way. */
    expect(whereThisTargetStands(t(12), counts(6, 12), 6)?.word).toBe('Behind');
    expect(whereThisTargetStands(t(37), [{ sessionNumber: 1, count: 6 }, { sessionNumber: 6, count: 37 }], 6)).toEqual({ word: 'Close', says: 'The last session has been counted, and it is 37, close to the aim of 40.' });
    expect(whereThisTargetStands(t(30), [{ sessionNumber: 1, count: 6 }, { sessionNumber: 6, count: 30 }], 6)?.word).toBe('Behind');
  });
  it('Met, Within and Over limit, and nothing where nobody said which way', () => {
    expect(whereThisTargetStands(t(40), counts(6, 40), 6)?.word).toBe('Met');
    expect(whereThisTargetStands(t(120, { direction: 'LIMIT', target: 180 }), [], null)?.word).toBe('Within');
    expect(whereThisTargetStands(t(254, { direction: 'LIMIT', target: 180 }), [], null)?.word).toBe('Over limit');
    expect(whereThisTargetStands(t(45, { direction: null, journeyDirection: 'unknown' }), [], 6)).toEqual({ word: null, says: 'Nobody has said whether 40 is something to reach or a limit not to go over, so how it stands cannot be said.' });
  });
});

describe('(a) a question is never made from words that are not an aim', () => {
  const aim = (name: string, more: Record<string, any> = {}) => ({ id: 'x', name, target: 12 as number | null, count: 1, start: 0, direction: 'AIM' as const, journeyDirection: 'up' as const, word: null, ...more });
  it('leaves out an aim stored as a sentence about somebody', () => {
    expect(theHeadlineQuestion([aim('They want to get 12 shops onboarded.')], new Date('2026-11-30T12:00:00Z'))).toBeNull();
  });
  it('keeps an aim that already says its number', () => {
    expect(theHeadlineQuestion([aim('Close 12 sales')], new Date('2026-11-30T12:00:00Z'), new Date('2026-10-02T12:00:00Z'))?.question).toBe('Will we close 12 sales by 30 November?');
  });
  it('asks a number with no time without a date, and nothing for words with no number that are not something to do', () => {
    expect(theHeadlineQuestion([aim('Shops onboarded')], null)?.question).toBe('Will we reach 12 shops onboarded?');
    expect(theHeadlineQuestion([aim('Customer satisfaction', { target: null })], new Date('2026-11-30T12:00:00Z'))).toBeNull();
  });
});
