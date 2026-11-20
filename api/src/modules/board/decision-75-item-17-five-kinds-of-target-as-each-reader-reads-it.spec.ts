import { GroundScenario } from '@prisma/client';
import { boardAs, SALES_RUN, BISI, FEMI, JUMA, SETUP_ADMIN, A_RELEASED_REPORT, type Setup } from './the-switchboards-sections-harness';
import { aTargetThisWeek } from '../reports/the-weekly-report';
import { aCountThatMovedSaid } from '../reports/a-count-that-moved-is-one-sentence';
import { theShareSays } from './your-share';
import { theTargetAsASentence } from '../conversation/each-target-is-a-sentence-about-whoever-set-it';
import { aGoalAsTheyReadIt } from '../grounds/what-a-participant-is-told-about-this';
import { theMeasuresSaidBack } from '../grounds/what-the-context-chat-heard';
import { whichWayItIsSaid, whatTheWordsSuggest, theQuestionAboutWhichWay, asADirection, THE_KINDS_NAME } from './an-aim-or-a-limit';

/**
 * DECISION 75, ITEM 17: ALL FIVE TARGET KINDS FROM THE PROTOTYPE, UP, LOWER IS BETTER, RATE, DEADLINE AND
 * ZERO (docs/prototype/source/data.js, the templates' "Targets, and how each reads").
 *
 * Before, a target was an aim or a limit, and nothing else. A share such as "Follow-up within 48 hours,
 * 90%" was read as 86 of 90 things; a date to meet had nowhere to keep its day; "Unexplained transactions,
 * 0" was an aim of nought, reached at once. Now each kind has its own plain sentence on the board, the
 * headline, the status word, the forecast, the weekly report, Today, the check-in and the say-back.
 *
 * On the sales check-in (Bisi runs it; Femi, Ngozi and Kwame check in), read on 2 October.
 */
const target = (id: string, name: string, n: number | null, count: number, direction: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', name, target: n, count, prevCount: count, ownerParticipantId: null, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null, assumes: [], direction, dueOn: null, ...more,
});
const RUN: Setup = {
  ...SALES_RUN,
  clock: { createdAt: new Date('2026-09-01T09:00:00Z'), timelineDays: 90, cadence: 'FORTNIGHTLY' },
  objectives: [
    target('o-rate', 'Follow-up within 48 hours', 90, 86, 'RATE', { sortOrder: 0 }),
    target('o-zero', 'Unexplained transactions', 0, 2, 'ZERO', { sortOrder: 1 }),
    target('o-up', 'Approved facilities this quarter', 40, 11, 'AIM', { sortOrder: 2 }),
    target('o-lower', 'Days to approve a facility', 10, 12, 'LIMIT', { sortOrder: 3 }),
    target('o-due', 'Credit policy signed off', null, 0, 'DEADLINE', { sortOrder: 4, dueOn: new Date('2026-10-30') }),
    target('o-late', 'Month-end close', null, 0, 'DEADLINE', { sortOrder: 5, dueOn: new Date('2026-09-30') }),
  ],
  snapshots: [
    { objectiveId: 'o-rate', sessionNumber: 1, count: 80 }, { objectiveId: 'o-rate', sessionNumber: 2, count: 86 },
    { objectiveId: 'o-zero', sessionNumber: 1, count: 0 }, { objectiveId: 'o-zero', sessionNumber: 2, count: 2 },
    { objectiveId: 'o-up', sessionNumber: 1, count: 6 }, { objectiveId: 'o-up', sessionNumber: 2, count: 11 },
  ] as any,
};
const row = (b: any, id: string) => (b.objectives ?? []).find((o: any) => o.id === id);

const WHAT_BISI_READS = {
  'o-rate': ['The team is aiming to keep follow-up within 48 hours at 90% or more.', 'Rate', null, 'It was 80% at the start and is 86% now, below the aim of 90% or more.', { word: 'Close', says: 'It is 86%, close to the aim of 90% or more.' }],
  'o-zero': ['The team is keeping unexplained transactions at zero.', 'Zero', null, 'There have been 2 so far. This should stay at zero, so any at all is a breach.', { word: 'Over limit', says: 'There have been 2, and this should stay at zero, so any at all is a breach.' }],
  'o-up': ['The team is aiming for 40 approved facilities this quarter.', 'Up', null, 'It was 6 at the start and is 11 now, and the aim is 40.', { word: 'Behind', says: 'At the pace it has kept since check-in 1, it would be about 31 by the last check-in, short of the aim of 40.' }],
  'o-lower': ['The team is keeping days to approve a facility to no more than 10.', 'Lower is better', null, 'It is 12 now, which is 2 over the limit of 10.', { word: 'Over limit', says: 'It is 12, which is over the limit of 10.' }],
  'o-due': ['The team has a date to meet for credit policy signed off.', 'Deadline', '2026-10-30', 'It is due by 30 October, and it is not done yet.', { word: null, says: 'It is due by 30 October, and it is not done yet.' }],
  'o-late': ['The team has a date to meet for month-end close.', 'Deadline', '2026-09-30', 'It was due by 30 September, and it is not done yet.', { word: 'Behind', says: 'It was due by 30 September, and it is not done yet.' }],
} as const;
const THE_QUESTION = 'Will we keep follow-up within 48 hours at 90% or more and keep unexplained transactions at zero by 30 November?';
const THE_ANSWER = 'So far it is 86%, below the aim of 90% or more. So far there have been 2, and any at all is a breach.';

describe('on the board, as Bisi, who runs it, reads it', () => {
  it('each kind has its own sentence, its own word and the prototype\'s own name', async () => {
    const b = await boardAs(RUN, ...BISI);
    for (const [id, [name, kind, dueOn, say, stands]] of Object.entries(WHAT_BISI_READS)) {
      const o = row(b, id);
      expect([o.name, o.kind, o.dueOn, o.journey.say, o.stands]).toEqual([name, kind, dueOn, say, stands]);
    }
  });

  it('the headline asks a share and a count to keep at zero in their own words', async () => {
    const b = await boardAs(RUN, ...BISI);
    expect(b.headline.question).toBe(THE_QUESTION);
    expect(b.headline.answer).toBe(THE_ANSWER);
    /* A share fills towards its number; zero and a date have nothing to fill. */
    expect(b.headline.bars).toEqual([{ objectiveId: 'o-rate', kind: 'aim', now: 86, target: 90, filled: 96, word: 'Close' }]);
  });

  it('the forecast says a share and zero in their own words, and gives no pace for a date', async () => {
    const b = await boardAs(RUN, ...BISI);
    const says = Object.fromEntries((b.forecast ?? []).map((f: any) => [f.objectiveId, [f.says, f.restsOn]]));
    expect(says['o-rate']).toEqual([
      'If it keeps changing at the pace it has since check-in 1, it would be about 100% by check-in 6, against an aim of 90% or more.',
      'It was 80% in check-in 1 and 86% in check-in 2, and this check-in runs for 6 check-ins.',
    ]);
    expect(says['o-zero'][0]).toBe('It is at 2, and this should stay at zero, so any at all is already a breach whatever the pace.');
    expect(says['o-due']).toBeUndefined();
    expect(says['o-late']).toBeUndefined();
  });

  it('a date that is done is met, and a count that stayed at zero is met', async () => {
    const b = await boardAs({ ...RUN, objectives: [
      target('o-late', 'Month-end close', null, 1, 'DEADLINE', { dueOn: new Date('2026-09-30') }),
      target('o-zero', 'Unexplained transactions', 0, 0, 'ZERO'),
    ] }, ...BISI);
    expect(row(b, 'o-late').stands).toEqual({ word: 'Met', says: 'It is done. It was due by 30 September.' });
    expect(row(b, 'o-zero').stands).toEqual({ word: 'Met', says: 'There have been none, which is where it should stay.' });
    expect(row(b, 'o-zero').journey.say).toBe('There have been none so far, which is where it should stay.');
  });
});

describe('the others who read the board', () => {
  it('the admin who set it up reads what Bisi reads', async () => {
    const b = await boardAs({ ...RUN, createdByUserId: 'u-setup' }, ...SETUP_ADMIN);
    expect(row(b, 'o-rate').stands).toEqual(WHAT_BISI_READS['o-rate'][4]);
    expect(b.headline.question).toBe(THE_QUESTION);
  });

  it('Femi, where everybody sees every number and the picture is shared, reads the same sentences and words', async () => {
    const b = await boardAs({ ...RUN, whoSeesTargets: 'EVERYBODY', report: A_RELEASED_REPORT }, ...FEMI);
    expect(row(b, 'o-zero').journey.say).toBe(WHAT_BISI_READS['o-zero'][3]);
    expect(row(b, 'o-late').stands).toEqual(WHAT_BISI_READS['o-late'][4]);
    expect(b.headline.question).toBe(THE_QUESTION);
  });

  it('Femi, where each person sees only their own numbers, reads each team target\'s own sentence and no word, headline or forecast', async () => {
    const b = await boardAs(RUN, ...FEMI);
    expect(row(b, 'o-rate').journey.say).toBe(WHAT_BISI_READS['o-rate'][3]);
    expect(row(b, 'o-rate').stands ?? null).toBeNull();
    expect(b.headline).toBeUndefined();
    expect(b.forecast).toBeUndefined();
  });

  it('Femi, where people are not named to each other, reads the team\'s sentences in the same words', async () => {
    const b = await boardAs({ ...RUN, peersVisibleToEachOther: false }, ...FEMI);
    expect(row(b, 'o-due').journey.say).toBe('It is due by 30 October, and it is not done yet.');
  });

  /* Decision 86 reverses decision 73 for admins: this used to pin that Juma read no word, headline or forecast. */
  it('Juma, an admin who only reads, reads each target\'s sentence, its word, the headline and the forecast, as Bisi does', async () => {
    const b = await boardAs(RUN, ...JUMA);
    const bisi = await boardAs(RUN, ...BISI);
    expect(row(b, 'o-lower').journey.say).toBe(WHAT_BISI_READS['o-lower'][3]);
    expect(row(b, 'o-lower').stands).toEqual({ says: 'It is 12, which is over the limit of 10.', word: 'Over limit' });
    expect(b.headline).toBeDefined();
    expect(b.headline).toEqual(bisi.headline);
    expect(b.forecast).toBeDefined();
    expect(b.forecast).toEqual(bisi.forecast);
  });

  it('on a performance plan, the person reviewed reads no word, headline or forecast on any kind', async () => {
    const b = await boardAs({ ...RUN, scenario: GroundScenario.PIP }, ...FEMI);
    for (const o of b.objectives ?? []) expect(o.stands ?? null).toBeNull();
    expect(b.headline).toBeUndefined();
    expect(b.forecast).toBeUndefined();
  });
});

describe('the weekly report, Today and since the last round', () => {
  const week = (name: string, n: number | null, count: number, from: number | null, direction: any) => ({ id: 'o', name, target: n, count, from, direction, ownerParticipantId: null, isADecisionAboutAPerson: false });
  it('whoever runs the check-in reads each kind against its number', () => {
    expect(aTargetThisWeek(week('Follow-up within 48 hours', 90, 86, 80, 'RATE'), 'team', true)?.says)
      .toBe("The team's follow-up within 48 hours went from 80% to 86% this week, against the aim of 90% or more. That is below it.");
    expect(aTargetThisWeek(week('Unexplained transactions', 0, 2, 0, 'ZERO'), 'team', true)?.says)
      .toBe("The team's unexplained transactions went from 0 to 2 this week, and this should stay at zero. Any at all is a breach.");
    expect(aTargetThisWeek(week('Unexplained transactions', 0, 0, 0, 'ZERO'), 'team', true)?.says).toBe('There were none again this week, which is where it should stay.');
    expect(aTargetThisWeek(week('Month-end close', null, 1, 0, 'DEADLINE'), 'team', true)).toEqual({ figure: 'Done', of: 'month-end close', says: 'It was done this week.' });
    expect(aTargetThisWeek(week('Month-end close', null, 0, 0, 'DEADLINE'), 'team', true)).toEqual({ figure: 'Not done yet', of: 'month-end close', says: 'It is a date to meet, and it is not done yet.' });
  });
  it('a person who may not read the aim reads the share with no number aimed for', () => {
    expect(aTargetThisWeek(week('Follow-up within 48 hours', 90, 86, 80, 'RATE'), 'team', false)?.says).toBe("The team's follow-up within 48 hours went from 80% to 86% this week.");
  });
  it('Today says a share, zero and a date in their own words', () => {
    expect(aCountThatMovedSaid({ name: 'Follow-up within 48 hours', target: 90, count: 86, prevCount: 80, direction: 'RATE' }, { whose: 'team', againstTheAim: true }))
      .toBe("The team's follow-up within 48 hours went from 80% to 86%, against the aim of 90% or more.");
    expect(aCountThatMovedSaid({ name: 'Unexplained transactions', target: 0, count: 2, prevCount: 0, direction: 'ZERO' }, { whose: 'team', againstTheAim: false }))
      .toBe("The team's unexplained transactions went from 0 to 2, and this should stay at zero.");
    expect(aCountThatMovedSaid({ name: 'Month-end close', target: null, count: 1, prevCount: 0, direction: 'DEADLINE' }, { whose: 'team', againstTheAim: true }))
      .toBe("The team's month-end close is done.");
  });
  it('a person\'s own share says each kind', () => {
    expect(theShareSays('You are aiming to keep follow-ups at 90% or more.', 86, 90, 'RATE')).toBe('You are aiming to keep follow-ups at 90% or more. You are at 86% so far.');
    expect(theShareSays('You are keeping errors at zero.', 0, 0, 'ZERO')).toBe('You are keeping errors at zero. There have been none so far, which is where it should stay.');
    expect(theShareSays('You have a date to meet for the report.', 0, 1, 'DEADLINE')).toBe('You have a date to meet for the report. It is not done yet.');
  });
});

describe('in a check-in, and at setup', () => {
  const who = { readerId: 'p-ngozi', readerFirstName: 'Ngozi', leadId: 'p-bisi', firstNameOf: (id: string) => ({ 'p-bisi': 'Bisi' } as any)[id] ?? null };
  it('the targets a check-in is given say each kind', () => {
    expect(theTargetAsASentence({ name: 'Follow-up within 48 hours', target: 90, direction: 'RATE', setByParticipantId: 'p-bisi' }, who)).toBe('The team is aiming to keep follow-up within 48 hours at 90% or more.');
    expect(theTargetAsASentence({ name: 'Unexplained transactions', target: 0, direction: 'ZERO', setByParticipantId: 'p-bisi' }, who)).toBe('The team is keeping unexplained transactions at zero.');
    expect(theTargetAsASentence({ name: 'Month-end close', target: null, direction: 'DEADLINE', setByParticipantId: 'p-bisi' }, who)).toBe('The team has a date to meet for month-end close.');
  });
  it('"About this check-in" says each kind', () => {
    const lead = { isTheirs: false, leadIn: 'The goal on this check-in is' };
    expect(aGoalAsTheyReadIt({ name: 'Follow-up within 48 hours', target: 90, direction: 'RATE' }, lead)).toBe('The goal on this check-in is follow-up within 48 hours, and the share to keep at or above is 90%.');
    expect(aGoalAsTheyReadIt({ name: 'Unexplained transactions', target: 0, direction: 'ZERO' }, lead)).toBe('The goal on this check-in is unexplained transactions, which should stay at zero, so any at all is a breach.');
    expect(aGoalAsTheyReadIt({ name: 'Month-end close', target: null, direction: 'DEADLINE' }, lead)).toBe('The goal on this check-in is month-end close, which is a date to meet.');
  });
  it('the say-back states each kind and offers the five in plain words', () => {
    expect(theMeasuresSaidBack([{ name: 'Follow-up within 48 hours', target: 90, direction: 'RATE' }, { name: 'Unexplained transactions', target: 0, direction: 'ZERO' }], 'before')).toBe(
      'I will set 2 measures for this check-in. "Follow-up within 48 hours" is a share to keep at 90% or more. "Unexplained transactions" is a count to keep at zero, so any at all is a breach. '
      + 'A number can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero. You can change any of them on the board, including what kind of number each one is.');
    expect(whichWayItIsSaid('Month-end close', 1, 'DEADLINE', '2026-10-05', new Date('2026-10-02T12:00:00Z'))).toBe('"Month-end close" is a date to meet, by 5 October.');
    expect(theQuestionAboutWhichWay(90)).toBe('What kind of number is 90? It can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero.');
  });
  it('the words of a name suggest a kind, which only the lead\'s yes keeps', () => {
    expect(['Follow-up rate', 'Onboarding completed %', 'Launch date', 'Pumps sold', 'Spending within budget'].map((n) => whatTheWordsSuggest(n, 40))).toEqual(['RATE', 'RATE', 'DEADLINE', 'AIM', 'LIMIT']);
    expect(whatTheWordsSuggest('Unexplained transactions', 0)).toBe('ZERO');
    expect(THE_KINDS_NAME).toEqual({ AIM: 'Up', LIMIT: 'Lower is better', RATE: 'Rate', DEADLINE: 'Deadline', ZERO: 'Zero' });
    expect(asADirection('Lower is better')).toBe('LIMIT');
  });
});
